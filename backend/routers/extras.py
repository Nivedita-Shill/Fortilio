import re
from collections import defaultdict
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import Avatar, Goal, GoalLink, Holding, Profile, Transaction, User
from routers.portfolio import TARGETS
from security import current_user

router = APIRouter(prefix="/api", tags=["extras"])
DATA_URL = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")

class AvatarIn(BaseModel):
    data_url: str = Field(max_length=400_000)

@router.get("/profile/avatar")
def get_avatar(u: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Avatar, u.id)
    return {"data_url": a.data_url if a else None}

@router.put("/profile/avatar")
def put_avatar(b: AvatarIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    if not DATA_URL.fullmatch(b.data_url):
        raise HTTPException(422, "Upload a PNG, JPG or WebP image.")
    a = db.get(Avatar, u.id) or Avatar(user_id=u.id)
    a.data_url = b.data_url; db.add(a); db.commit()
    return {"data_url": a.data_url}

@router.delete("/profile/avatar", status_code=204)
def del_avatar(u: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Avatar, u.id)
    if a: db.delete(a); db.commit()

def xirr(flows):
    if len(flows) < 2: return None
    t0 = min(d for d, _ in flows)
    if (max(d for d, _ in flows) - t0).days < 30: return None
    f = lambda r: sum(a / (1 + r) ** ((d - t0).days / 365) for d, a in flows)
    lo, hi = -0.99, 10.0
    if f(lo) * f(hi) > 0: return None
    for _ in range(100):
        m = (lo + hi) / 2
        if f(lo) * f(m) <= 0: hi = m
        else: lo = m
    return round(m * 100, 2)

@router.get("/reports/overview")
def overview(u: User = Depends(current_user), db: Session = Depends(get_db)):
    hs = db.scalars(select(Holding).where(Holding.user_id == u.id)).all()
    txs = db.scalars(select(Transaction).where(Transaction.user_id == u.id).order_by(Transaction.day, Transaction.id)).all()
    pos, realized, flows = {}, 0.0, []
    monthly = defaultdict(lambda: {"bought": 0.0, "sold": 0.0})
    for t in txs:  # replay in date order using average-cost method
        un, avg = pos.get(t.holding_id, (0.0, 0.0)); amt = t.units * t.price; m = t.day.strftime("%Y-%m")
        if t.type == "BUY":
            avg = (un * avg + amt) / (un + t.units); un += t.units
            flows.append((t.day, -amt)); monthly[m]["bought"] += amt
        else:
            realized += (t.price - avg) * t.units; un -= t.units
            flows.append((t.day, amt)); monthly[m]["sold"] += amt
        pos[t.holding_id] = (un, avg)
    total = sum(h.units * h.current_price for h in hs)
    invested = sum(h.units * h.average_cost for h in hs)
    rows, cur = [], defaultdict(float)
    for h in hs:
        inv, val = h.units * h.average_cost, h.units * h.current_price; cur[h.category] += val
        rows.append({"symbol": h.symbol, "name": h.name, "category": h.category, "invested": round(inv, 2), "value": round(val, 2),
                     "pl": round(val - inv, 2), "return_pct": round((val - inv) / inv * 100, 2) if inv else 0,
                     "weight": round(val / total * 100, 2) if total else 0})
    ranked = sorted(rows, key=lambda r: r["return_pct"])
    p = db.get(Profile, u.id); label = p.risk_label if p else None
    reb = []
    if label and total:
        for cat, tgt in TARGETS[label].items():
            diff = total * tgt / 100 - cur.get(cat, 0)
            reb.append({"category": cat, "current_pct": round(cur.get(cat, 0) / total * 100, 1), "target_pct": tgt,
                        "action": "BUY" if diff > 0 else "SELL", "amount": round(abs(diff), 2)})
    return {"total_value": round(total, 2), "unrealized_pl": round(total - invested, 2), "realized_pl": round(realized, 2),
            "xirr_pct": xirr(flows + [(date.today(), total)]) if flows and total > 0 else None, "risk_label": label,
            "by_holding": rows, "best": ranked[::-1][:3], "worst": ranked[:3], "rebalance": reb,
            "monthly": [{"month": k, **{a: round(b, 2) for a, b in v.items()}} for k, v in sorted(monthly.items())]}


class LinkIn(BaseModel):
    holding_id: int
    percent: float = Field(gt=0, le=100)

class LinksIn(BaseModel):
    links: list[LinkIn] = Field(max_length=50)

@router.get("/goals/progress")
def goals_progress(u: User = Depends(current_user), db: Session = Depends(get_db)):
    goals = db.scalars(select(Goal).where(Goal.user_id == u.id).order_by(Goal.target_date)).all()
    hs = {h.id: h for h in db.scalars(select(Holding).where(Holding.user_id == u.id))}
    gids = [g.id for g in goals]
    links = db.scalars(select(GoalLink).where(GoalLink.goal_id.in_(gids))).all() if gids else []
    used, per = defaultdict(float), defaultdict(list)
    for l in links:
        h = hs.get(l.holding_id)
        if not h: continue  # holding was deleted
        used[h.id] += l.percent
        per[l.goal_id].append({"holding_id": h.id, "symbol": h.symbol, "name": h.name, "percent": l.percent,
                               "value": round(h.units * h.current_price * l.percent / 100, 2)})
    return {"goals": [{"id": g.id, "name": g.name, "target_amount": g.target_amount, "target_date": g.target_date.isoformat(),
                       "monthly_contribution": g.monthly_contribution, "links": per[g.id],
                       "linked_value": round(sum(x["value"] for x in per[g.id]), 2)} for g in goals],
            "holdings": [{"id": h.id, "name": h.name, "symbol": h.symbol, "value": round(h.units * h.current_price, 2),
                          "free_percent": round(max(0.0, 100 - used[h.id]), 2)} for h in hs.values()]}

@router.put("/goals/{gid}/links")
def set_links(gid: int, b: LinksIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    g = db.get(Goal, gid)
    if not g or g.user_id != u.id:
        raise HTTPException(404, "Goal not found.")
    hs = {h.id: h for h in db.scalars(select(Holding).where(Holding.user_id == u.id))}
    seen = set()
    for l in b.links:
        if l.holding_id not in hs: raise HTTPException(422, "Unknown holding.")
        if l.holding_id in seen: raise HTTPException(422, "Each holding can be linked once per goal.")
        seen.add(l.holding_id)
    other = [x.id for x in db.scalars(select(Goal).where(Goal.user_id == u.id)) if x.id != gid]
    used = defaultdict(float)
    if other:
        for l in db.scalars(select(GoalLink).where(GoalLink.goal_id.in_(other))):
            if l.holding_id in hs: used[l.holding_id] += l.percent
    for l in b.links:
        if used[l.holding_id] + l.percent > 100.0001:
            raise HTTPException(422, f"Only {round(max(0, 100 - used[l.holding_id]), 1)}% of {hs[l.holding_id].symbol} is free. The rest is linked to other goals.")
    for old in db.scalars(select(GoalLink).where(GoalLink.goal_id == gid)): db.delete(old)
    db.add_all([GoalLink(goal_id=gid, holding_id=l.holding_id, percent=l.percent) for l in b.links]); db.commit()
    return {"ok": True}
