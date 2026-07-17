from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.note import Note
from app.models.lead import Lead
from app.models.user import User
from app.models.activity import Activity, ActivityType
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse
from app.core.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/leads", tags=["notes"])


@router.get("/{lead_id}/notes", response_model=List[NoteResponse])
def get_notes(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = (
        db.query(Note)
        .options(joinedload(Note.author))
        .filter(Note.lead_id == lead_id)
        .order_by(Note.created_at.desc())
        .all()
    )
    return notes


@router.post("/{lead_id}/notes", response_model=NoteResponse)
def create_note(
    lead_id: str,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    note = Note(lead_id=lead_id, author_id=current_user.id, content=payload.content)
    db.add(note)

    activity = Activity(
        lead_id=lead_id,
        user_id=current_user.id,
        activity_type=ActivityType.note_added,
        description=f"Note added by {current_user.name}",
        meta_data={},
    )
    db.add(activity)
    lead.last_activity_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note


@router.put("/{lead_id}/notes/{note_id}", response_model=NoteResponse)
def update_note(
    lead_id: str,
    note_id: str,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.lead_id == lead_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit another user's note")
    note.content = payload.content
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{lead_id}/notes/{note_id}")
def delete_note(
    lead_id: str,
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.lead_id == lead_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author_id != current_user.id:
        from app.models.user import UserRole
        if current_user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
