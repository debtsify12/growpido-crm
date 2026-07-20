import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    member = "member"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Tenant
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    # Identity
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    employee_id = Column(String, nullable=True)  # e.g. EMP-001

    # Role & Access
    role = Column(SAEnum(UserRole), default=UserRole.member, nullable=False)
    is_active = Column(Boolean, default=True)

    # Profile
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    join_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    assigned_leads = relationship(
        "Lead", back_populates="assigned_user", foreign_keys="Lead.assigned_to"
    )
    tasks = relationship(
        "Task", back_populates="assigned_user", foreign_keys="Task.assigned_to"
    )
    notes = relationship("Note", back_populates="author")
    activities = relationship("Activity", back_populates="user")
    work_logs = relationship("WorkLog", back_populates="user")
