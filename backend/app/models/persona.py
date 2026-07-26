import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.database import Base

class Persona(Base):
    __tablename__ = "personas"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    context = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
