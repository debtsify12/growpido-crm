import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Tenant
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="notes")
    author = relationship("User", back_populates="notes")
