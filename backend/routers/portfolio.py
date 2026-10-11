from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import Holding, Profile, Snapshot, Transaction, User
from schemas import HoldingIn, PriceIn, TxIn
from security import current_user

router = APIRouter(prefix="/api", tags=["portfolio"])
TARGETS = {"Conservative": {"Equity Funds": 30, "Debt Funds": 60, "Gold": 10},
           "Moderate": {"Equity Funds": 55, "Debt Funds": 35, "Gold": 10},
           "Aggressive": {"Equity Funds": 75, "Debt Funds": 20, "Gold": 5}}

def _mine(db, uid):
    return db.scalars(select(Holding).where(Holding.user_id == uid)).all()

def _snap(db, uid):
    v = sum(h.units * h.current_price for h in _mine(db, uid))
    s = db.scalar(select(Snapshot).where(Snapshot.user_id == uid, Snapshot.day == date.today()))
    if s: s.value = v
    else: db.add(Snapshot(user_id=uid, day=date.today(), value=v))

def _own(db, uid, hid) -> Holding:
    h = db.get(Holding, hid)
    if not h or h.user_id != uid:
        raise HTTPException(404, "Holding not found.")
    return h

def _out(h: Holding):
    inv, cur = h.units * h.average_cost, h.units * h.current_price
    return {"id": h.id, "name": h.name, "symbol": h.symbol, "category": h.category, "units": round(h.units, 4),
            "average_cost": h.average_cost, "current_price": h.current_price, "invested_value": round(inv, 2),
            "current_value": round(cur, 2), "profit_loss": round(cur - inv, 2),
            "return_percent": round((cur - inv) / inv * 100, 2) if inv else 0}

@router.get("/summary")
def summary(u: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = _mine(db, u.id)
    inv = sum(h.units * h.average_cost for h in rows); cur = sum(h.units * h.current_price for h in rows)
    return {"invested_value": round(inv, 2), "current_value": round(cur, 2), "profit_loss": round(cur - inv, 2),
            "return_percent": round((cur - inv) / inv * 100, 2) if inv else 0, "holdings_count": len(rows), "currency": "INR",
            "data_note": "Values use prices you enter. No live market data."}

@router.get("/holdings")
def holdings(search: str = Query("", max_length=100), category: str = Query("", max_length=40),
             u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Holding).where(Holding.user_id == u.id).order_by(Holding.category, Holding.name)
    if search.strip():
        t = f"%{search.strip()}%"; q = q.where(Holding.name.ilike(t) | Holding.symbol.ilike(t))
    if category and category != "All":
        q = q.where(Holding.category == category)
    return [_out(h) for h in db.scalars(q)]

@router.post("/holdings", status_code=201)
def add_holding(b: HoldingIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    sym = b.symbol.upper()
    if b.purchase_date and b.purchase_date > date.today():
        raise HTTPException(422, "Purchase date cannot be in the future.")
    if db.scalar(select(Holding).where(Holding.user_id == u.id, Holding.symbol == sym)):
        raise HTTPException(409, f"You already hold {sym}. Record a BUY under Transactions instead.")
    h = Holding(user_id=u.id, name=b.name.strip(), symbol=sym, category=b.category, units=b.units,
                average_cost=b.average_cost, current_price=b.current_price)
    db.add(h); db.flush()
    db.add(Transaction(user_id=u.id, holding_id=h.id, symbol=sym, type="BUY", units=b.units, price=b.average_cost,
                       day=b.purchase_date or date.today(), note="Opening position"))
    _snap(db, u.id); db.commit()
    return _out(h)

@router.put("/holdings/{hid}/price")
def set_price(hid: int, b: PriceIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    h = _own(db, u.id, hid); h.current_price = b.current_price
    db.flush(); _snap(db, u.id); db.commit()
    return _out(h)

@router.delete("/holdings/{hid}", status_code=204)
def del_holding(hid: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    h = _own(db, u.id, hid)
    for t in db.scalars(select(Transaction).where(Transaction.holding_id == hid)): db.delete(t)
    db.delete(h); db.flush(); _snap(db, u.id); db.commit()

@router.post("/transactions", status_code=201)
def add_tx(b: TxIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    h = _own(db, u.id, b.holding_id)
    if b.day > date.today():
        raise HTTPException(422, "Transaction date cannot be in the future.")
    if b.type == "BUY":
        h.average_cost = (h.units * h.average_cost + b.units * b.price) / (h.units + b.units); h.units += b.units
    else:
        if b.units > h.units + 1e-9:
            raise HTTPException(422, f"You only hold {round(h.units, 4)} units of {h.symbol}.")
        h.units -= b.units
    t = Transaction(user_id=u.id, holding_id=h.id, symbol=h.symbol, type=b.type, units=b.units, price=b.price, day=b.day, note=b.note)
    db.add(t); db.flush(); _snap(db, u.id); db.commit()
    return {"id": t.id}

@router.get("/transactions")
def txs(u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Transaction).where(Transaction.user_id == u.id).order_by(Transaction.day.desc(), Transaction.id.desc()).limit(100)
    return [{"id": t.id, "symbol": t.symbol, "type": t.type, "units": t.units, "price": t.price,
             "day": t.day.isoformat(), "note": t.note} for t in db.scalars(q)]

@router.get("/allocation")
def allocation(u: User = Depends(current_user), db: Session = Depends(get_db)):
    out: dict[str, float] = {}
    for h in _mine(db, u.id): out[h.category] = out.get(h.category, 0) + h.units * h.current_price
    return [{"category": k, "value": round(v, 2)} for k, v in out.items() if v > 0]

@router.get("/history")
def history(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"date": s.day.isoformat(), "value": round(s.value, 2)}
            for s in db.scalars(select(Snapshot).where(Snapshot.user_id == u.id).order_by(Snapshot.day))]

@router.get("/insights")
def insights(u: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(Profile, u.id); label = p.risk_label if p else None
    rows = _mine(db, u.id); total = sum(h.units * h.current_price for h in rows)
    cur = {}
    for h in rows: cur[h.category] = cur.get(h.category, 0) + h.units * h.current_price
    pct = {k: round(v / total * 100, 1) for k, v in cur.items()} if total else {}
    msgs = []
    if label and total:
        for cat, tgt in TARGETS[label].items():
            gap = pct.get(cat, 0) - tgt
            if abs(gap) >= 10:
                msgs.append(f"{cat} is {pct.get(cat, 0)}% of your portfolio versus roughly {tgt}% often used for a {label.lower()} profile ({'above' if gap > 0 else 'below'} by {abs(round(gap))} points).")
        if not msgs: msgs.append("Your mix is close to the typical range for your risk profile.")
    return {"risk_label": label, "target": TARGETS.get(label, {}), "current": pct, "messages": msgs,
            "disclaimer": "Educational guidance only, not investment advice."}
