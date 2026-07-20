from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.lead import Lead
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantWithStats
from app.schemas.user import UserCreate, UserResponse
from app.core.auth import get_super_admin_user, get_password_hash

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("", response_model=List[TenantWithStats])
def list_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(get_super_admin_user),
):
    """List all tenants with stats — super admin only."""
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    result = []
    for tenant in tenants:
        user_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant.id).scalar()
        lead_count = db.query(func.count(Lead.id)).filter(Lead.tenant_id == tenant.id).scalar()
        result.append(TenantWithStats(
            **TenantResponse.model_validate(tenant).model_dump(),
            user_count=user_count or 0,
            lead_count=lead_count or 0,
        ))
    return result


@router.post("", response_model=TenantResponse, status_code=201)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_super_admin_user),
):
    """Create a new tenant — super admin only."""
    existing = db.query(Tenant).filter(Tenant.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tenant slug already exists")

    tenant = Tenant(
        name=payload.name,
        slug=payload.slug,
        plan=payload.plan,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/{tenant_id}", response_model=TenantWithStats)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_super_admin_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    user_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant_id).scalar()
    lead_count = db.query(func.count(Lead.id)).filter(Lead.tenant_id == tenant_id).scalar()
    return TenantWithStats(
        **TenantResponse.model_validate(tenant).model_dump(),
        user_count=user_count or 0,
        lead_count=lead_count or 0,
    )


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_super_admin_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant


@router.post("/{tenant_id}/admins", response_model=UserResponse, status_code=201)
def create_tenant_admin(
    tenant_id: str,
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_super_admin_user),
):
    """Create an admin user for a specific tenant — super admin only."""
    from app.models.user import UserRole

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.admin,
        tenant_id=tenant_id,
        department=payload.department,
        designation=payload.designation,
        phone=payload.phone,
        employee_id=payload.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
