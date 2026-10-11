from datetime import date, datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(300), nullable=False)
    onboarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Profile(Base):
    __tablename__ = "profiles"
    user_id = Column(ForeignKey("users.id"), primary_key=True)
    phone = Column(String(20)); city = Column(String(80)); occupation = Column(String(80))
    income_range = Column(String(40)); horizon_years = Column(Integer, default=5)
    risk_score = Column(Integer); risk_label = Column(String(20))

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False); target_amount = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False); monthly_contribution = Column(Float, default=0)

class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (UniqueConstraint("user_id", "symbol"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False); symbol = Column(String(20), nullable=False)
    category = Column(String(40), nullable=False); units = Column(Float, nullable=False)
    average_cost = Column(Float, nullable=False); current_price = Column(Float, nullable=False)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"), index=True, nullable=False)
    holding_id = Column(ForeignKey("holdings.id"), nullable=False)
    symbol = Column(String(20)); type = Column(String(4)); units = Column(Float); price = Column(Float)
    day = Column(Date, default=date.today); note = Column(String(200))

class Snapshot(Base):
    __tablename__ = "snapshots"
    __table_args__ = (UniqueConstraint("user_id", "day"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"), index=True, nullable=False)
    day = Column(Date, nullable=False); value = Column(Float, nullable=False)

class Avatar(Base):
    __tablename__ = "avatars"
    user_id = Column(ForeignKey("users.id"), primary_key=True)
    data_url = Column(Text, nullable=False)

class GoalLink(Base):
    __tablename__ = "goal_links"
    id = Column(Integer, primary_key=True)
    goal_id = Column(Integer, index=True, nullable=False)
    holding_id = Column(Integer, index=True, nullable=False)
    percent = Column(Float, nullable=False)
