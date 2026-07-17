import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


class TaskType(str, enum.Enum):
    follow_up = "Follow Up"
    call = "Call"
    email = "Email"
    meeting = "Meeting"
    onboarding = "Onboarding"
    other = "Other"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True, index=True)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(SAEnum(TaskType), default=TaskType.follow_up)
    due_date = Column(DateTime, nullable=True)

    is_done = Column(Boolean, default=False)
    is_auto_created = Column(Boolean, default=False)  # true if created by automation

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    lead = relationship("Lead", back_populates="tasks")
    assigned_user = relationship("User", back_populates="tasks", foreign_keys=[assigned_to])
