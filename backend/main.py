import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
import models  # noqa: F401
from routers import auth, extras, portfolio, profile

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Fortilio API", version="2.0.0", lifespan=lifespan,
              description="Personal portfolio tracker with accounts, onboarding, holdings, transactions and goals.")
origin = os.getenv("FRONTEND_ORIGIN", "*")
app.add_middleware(CORSMiddleware, allow_origins=["*"] if origin == "*" else origin.split(","),
                   allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, profile.router, portfolio.router, extras.router):
    app.include_router(r)

@app.get("/health")
def health():
    return {"status": "ok", "service": "Fortilio API"}
