import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.member, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_leads = relationship(
        "Lead", back_populates="assigned_user", foreign_keys="Lead.assigned_to"
    )
    tasks = relationship(
        "Task", back_populates="assigned_user", foreign_keys="Task.assigned_to"
    )
    notes = relationship("Note", back_populates="author")
    activities = relationship("Activity", back_populates="user")
