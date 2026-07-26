from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.persona import Persona
from app.schemas.persona import PersonaCreate, PersonaOut, PersonaUpdate

router = APIRouter(prefix="/api/personas", tags=["Personas"])

@router.get("", response_model=List[PersonaOut])
def get_personas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all personas for the current tenant."""
    personas = db.query(Persona).filter(Persona.tenant_id == current_user.tenant_id).all()
    return personas

@router.post("", response_model=PersonaOut, status_code=status.HTTP_201_CREATED)
def create_persona(
    persona_in: PersonaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new persona."""
    new_persona = Persona(
        name=persona_in.name,
        description=persona_in.description,
        context=persona_in.context,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )
    db.add(new_persona)
    db.commit()
    db.refresh(new_persona)
    return new_persona

@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(
    persona_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a persona."""
    persona = db.query(Persona).filter(
        Persona.id == persona_id,
        Persona.tenant_id == current_user.tenant_id
    ).first()
    
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    db.delete(persona)
    db.commit()
    return None
