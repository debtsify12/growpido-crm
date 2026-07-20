import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Float, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


class WorkLogCategory(str, enum.Enum):
    development = "Development"
    sales = "Sales"
    client_management = "Client Management"
    design = "Design"
    research = "Research"
    meetings = "Meetings"
    admin = "Admin"
    other = "Other"


class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Tenant
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    # Who logged it
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Optional lead context
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True, index=True)

    # Work entry
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    description = Column(Text, nullable=False)
    hours = Column(Float, nullable=True)
    category = Column(SAEnum(WorkLogCategory), default=WorkLogCategory.other, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="work_logs")
