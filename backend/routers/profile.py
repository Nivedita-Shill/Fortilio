from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import Goal, Profile, User
from schemas import GoalIn, ProfileIn
from security import current_user

router = APIRouter(prefix="/api", tags=["profile"])

def risk_label(score: int) -> str:
    return "Conservative" if score <= 7 else "Moderate" if score <= 12 else "Aggressive"

def profile_out(p: Profile | None):
    if not p:
        return None
    return {"phone": p.phone, "city": p.city, "occupation": p.occupation, "income_range": p.income_range,
            "horizon_years": p.horizon_years, "risk_score": p.risk_score, "risk_label": p.risk_label}

@router.get("/profile")
def get_profile(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return profile_out(db.get(Profile, u.id))

@router.put("/profile")
def put_profile(b: ProfileIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(Profile, u.id) or Profile(user_id=u.id)
    for k in ("phone", "city", "occupation", "income_range", "horizon_years"):
        setattr(p, k, getattr(b, k))
    if b.risk_answers:
        if any(a < 1 or a > 4 for a in b.risk_answers):
            raise HTTPException(422, "Risk answers must be between 1 and 4.")
        p.risk_score = sum(b.risk_answers); p.risk_label = risk_label(p.risk_score)
    elif p.risk_score is None:
        raise HTTPException(422, "Please answer the risk questions.")
    db.add(p); u.onboarded = True; db.commit()
    return profile_out(p)

def goal_out(g: Goal):
    return {"id": g.id, "name": g.name, "target_amount": g.target_amount,
            "target_date": g.target_date.isoformat(), "monthly_contribution": g.monthly_contribution}

@router.get("/goals")
def list_goals(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return [goal_out(g) for g in db.scalars(select(Goal).where(Goal.user_id == u.id).order_by(Goal.target_date))]

@router.post("/goals", status_code=201)
def add_goal(b: GoalIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    g = Goal(user_id=u.id, **b.model_dump()); db.add(g); db.commit()
    return goal_out(g)

@router.delete("/goals/{gid}", status_code=204)
def del_goal(gid: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    g = db.get(Goal, gid)
    if not g or g.user_id != u.id:
        raise HTTPException(404, "Goal not found.")
    db.delete(g); db.commit()
