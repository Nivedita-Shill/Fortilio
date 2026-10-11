from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field

CATEGORIES = Literal["Equity Funds", "Debt Funds", "Gold", "Other"]

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=200)
    password: str = Field(min_length=8, max_length=100)

class LoginIn(BaseModel):
    email: str
    password: str

class ProfileIn(BaseModel):
    phone: str = Field(pattern=r"^[0-9+\-\s]{7,20}$")
    city: str = Field(min_length=2, max_length=80)
    occupation: str = Field(min_length=2, max_length=80)
    income_range: str = Field(max_length=40)
    horizon_years: int = Field(ge=1, le=40)
    risk_answers: Optional[list[int]] = Field(default=None, min_length=4, max_length=4)

class GoalIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    target_amount: float = Field(gt=0)
    target_date: date
    monthly_contribution: float = Field(default=0, ge=0)

class HoldingIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    symbol: str = Field(pattern=r"^[A-Za-z0-9\-_.]{1,20}$")
    category: CATEGORIES
    units: float = Field(gt=0)
    average_cost: float = Field(gt=0)
    current_price: float = Field(gt=0)
    purchase_date: Optional[date] = None

class PriceIn(BaseModel):
    current_price: float = Field(gt=0)

class TxIn(BaseModel):
    holding_id: int
    type: Literal["BUY", "SELL"]
    units: float = Field(gt=0)
    price: float = Field(gt=0)
    day: date
    note: str = Field(default="", max_length=200)
