import os, hashlib, secrets, hmac
from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User

SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
bearer = HTTPBearer(auto_error=False)

def hash_password(p: str) -> str:
    salt = secrets.token_hex(16)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", p.encode(), salt.encode(), 200_000).hex()

def verify_password(p: str, stored: str) -> bool:
    salt, h = stored.split("$")
    return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", p.encode(), salt.encode(), 200_000).hex(), h)

def create_token(uid: int) -> str:
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(days=7)}, SECRET, algorithm="HS256")

def current_user(c: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not c:
        raise HTTPException(401, "Please log in to continue.")
    try:
        uid = int(jwt.decode(c.credentials, SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(401, "Your session expired. Please log in again.")
    u = db.get(User, uid)
    if not u:
        raise HTTPException(401, "Account not found.")
    return u
