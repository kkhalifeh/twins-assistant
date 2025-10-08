from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime

# User and Child models
class Child(BaseModel):
    id: str
    name: str
    date_of_birth: datetime
    gender: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    name: str
    role: str
    auth_token: Optional[str] = None
    children: List[Child] = []

class UserContext(BaseModel):
    user: User
    phone_number: Optional[str] = None
    children_names: List[str] = []

# Command models with dynamic child support
class FeedingCommand(BaseModel):
    action: Literal["create_feeding_log"]
    child_name: str
    amount: Optional[float] = Field(None, description="Amount in ml")
    type: Literal["BREAST", "BOTTLE", "FORMULA", "MIXED", "SOLID"]
    time: Optional[str] = Field(None, description="ISO format time")
    notes: Optional[str] = None

class SleepCommand(BaseModel):
    action: Literal["start_sleep", "end_sleep", "create_sleep_log"]
    child_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    type: Optional[Literal["NAP", "NIGHT"]] = "NAP"
    quality: Optional[Literal["DEEP", "RESTLESS", "INTERRUPTED"]] = None
    notes: Optional[str] = None

class DiaperCommand(BaseModel):
    action: Literal["create_diaper_log"]
    child_name: str
    type: Literal["WET", "DIRTY", "MIXED"]
    consistency: Optional[Literal["NORMAL", "WATERY", "HARD"]] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class HealthCommand(BaseModel):
    action: Literal["create_health_log"]
    child_name: str
    type: Literal["TEMPERATURE", "MEDICINE", "WEIGHT", "HEIGHT", "SYMPTOM"]
    value: str
    unit: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class QueryCommand(BaseModel):
    action: Literal["query"]
    query_type: str
    child_name: Optional[str] = None
    details: Dict[str, Any] = {}

# API Request/Response models
class ProcessMessageRequest(BaseModel):
    message: str
    user_id: str
    user_phone: Optional[str] = None
    user_name: Optional[str] = None

class RegisterUserRequest(BaseModel):
    phone_number: str
    email: str
    password: str
    name: str

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None