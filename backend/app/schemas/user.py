from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.member
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    bio: Optional[str] = None
    join_date: Optional[datetime] = None
    tenant_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    bio: Optional[str] = None
    join_date: Optional[datetime] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    tenant_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    bio: Optional[str] = None
    join_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    tenant_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileStats(BaseModel):
    total_leads: int
    open_leads: int
    won_leads: int
    lost_leads: int
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    work_hours_this_month: float


class UserProfile(BaseModel):
    user: UserResponse
    stats: UserProfileStats


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
