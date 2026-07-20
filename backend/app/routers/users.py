from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPublic
from app.core.auth import get_current_user, get_admin_user, get_super_admin_user, get_password_hash
from app.services.email import send_new_user_credentials_email

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List users in tenant — super_admin sees all."""
    query = db.query(User).filter(User.is_active == True)

    if current_user.role != UserRole.super_admin:
        query = query.filter(User.tenant_id == current_user.tenant_id)

    return query.all()


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Admins can only create members within their tenant
    tenant_id = payload.tenant_id
    if admin.role == UserRole.admin:
        tenant_id = admin.tenant_id
        if payload.role == UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Cannot assign super_admin role")

    # Auto-generate employee_id if not provided
    employee_id = payload.employee_id
    if not employee_id and tenant_id:
        count = db.query(User).filter(User.tenant_id == tenant_id).count()
        employee_id = f"EMP-{str(count + 1).zfill(3)}"

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
        department=payload.department,
        designation=payload.designation,
        phone=payload.phone,
        employee_id=employee_id,
        bio=payload.bio,
        join_date=payload.join_date,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send email with login credentials
    background_tasks.add_task(send_new_user_credentials_email, user.email, user.name, payload.password)
    
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Enforce tenant isolation
    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Members can only update their own profile
    if current_user.role == UserRole.member and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Tenant admins can only update users in their tenant
    if current_user.role == UserRole.admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = payload.model_dump(exclude_unset=True)

    # Prevent role escalation
    if "role" in update_data:
        if current_user.role == UserRole.admin and update_data["role"] == UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Cannot assign super_admin role")

    for field, value in update_data.items():
        if field == "password":
            user.hashed_password = get_password_hash(value)
        else:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    # Tenant isolation
    if admin.role == UserRole.admin and user.tenant_id != admin.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.name} deactivated"}
