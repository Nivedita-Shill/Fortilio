from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginIn, RegisterIn
from security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

def user_out(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "onboarded": bool(u.onboarded)}

@router.post("/register", status_code=201)
def register(b: RegisterIn, db: Session = Depends(get_db)):
    email = b.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists. Try logging in.")
    u = User(email=email, name=b.name.strip(), password_hash=hash_password(b.password))
    db.add(u); db.commit()
    return {"token": create_token(u.id), "user": user_out(u)}

@router.post("/login")
def login(b: LoginIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == b.email.lower().strip()))
    if not u or not verify_password(b.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    return {"token": create_token(u.id), "user": user_out(u)}

@router.get("/me")
def me(u: User = Depends(current_user)):
    return user_out(u)
