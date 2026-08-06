"""
Integrations Router — Google Sheets & External Workflows
Growpido CRM
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.config import settings
from app.services.google_sheets import (
    sync_google_sheet_to_crm,
    process_sheet_webhook_event,
    generate_google_apps_script_code,
    DEFAULT_SPREADSHEET_ID,
    DEFAULT_GID,
)

router = APIRouter(prefix="/api/integrations", tags=["Integrations & Google Sheets"])

# In-memory storage for last sync state (can also be saved in Tenant/DB)
_sync_state: Dict[str, Any] = {
    "spreadsheet_id": DEFAULT_SPREADSHEET_ID,
    "gid": DEFAULT_GID,
    "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{DEFAULT_SPREADSHEET_ID}/edit?gid={DEFAULT_GID}",
    "last_synced_at": None,
    "last_sync_result": None,
    "auto_sync_enabled": True,
    "sync_interval_minutes": 15,
}


class SyncRequest(BaseModel):
    spreadsheet_id: Optional[str] = None
    gid: Optional[str] = None


class WebhookPayload(BaseModel):
    action: Optional[str] = "edit"
    row: Optional[int] = None
    data: Dict[str, Any] = {}
    timestamp: Optional[str] = None


@router.get("/google-sheets/config")
def get_google_sheets_config(
    current_user: User = Depends(get_current_user),
):
    """
    Get current Google Sheets configuration and sync history.
    """
    webhook_url = f"{settings.FRONTEND_URL.replace('3000', '8000')}/api/integrations/google-sheets/webhook"
    return {
        **_sync_state,
        "webhook_url": webhook_url,
        "script_code": generate_google_apps_script_code(webhook_url),
    }


@router.post("/google-sheets/sync")
def trigger_google_sheets_sync(
    payload: Optional[SyncRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers bidirectional synchronization between Google Sheets and Growpido CRM.
    """
    sheet_id = (payload.spreadsheet_id if payload and payload.spreadsheet_id else _sync_state["spreadsheet_id"]) or DEFAULT_SPREADSHEET_ID
    gid = (payload.gid if payload and payload.gid else _sync_state["gid"]) or DEFAULT_GID

    try:
        result = sync_google_sheet_to_crm(
            db=db,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            spreadsheet_id=sheet_id,
            gid=gid,
        )
        _sync_state["last_synced_at"] = result["synced_at"]
        _sync_state["last_sync_result"] = result
        _sync_state["spreadsheet_id"] = sheet_id
        _sync_state["gid"] = gid
        _sync_state["spreadsheet_url"] = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?gid={gid}"
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/google-sheets/webhook")
def receive_google_sheets_webhook(
    payload: WebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Public webhook endpoint called by Google Apps Script triggers on spreadsheet edit.
    """
    try:
        # Default to first admin user if not authenticated
        first_user = db.query(User).first()
        tenant_id = first_user.tenant_id if first_user else None
        user_id = first_user.id if first_user else None

        result = process_sheet_webhook_event(
            db=db,
            payload=payload.model_dump(),
            tenant_id=tenant_id,
            user_id=user_id,
        )
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/google-sheets/script")
def get_apps_script_code(
    request: Request,
):
    """
    Returns copyable Google Apps Script code for 2-way real-time sync.
    """
    base_url = str(request.base_url).rstrip("/")
    webhook_url = f"{base_url}/api/integrations/google-sheets/webhook"
    return {
        "webhook_url": webhook_url,
        "script": generate_google_apps_script_code(webhook_url),
    }
