"""
Google Sheets Bidirectional Synchronization Service
Growpido CRM
"""

import csv
import io
import json
import logging
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadStage, LeadPriority, LeadSource
from app.models.activity import Activity, ActivityType
from app.models.task import Task, TaskType
from app.models.note import Note

logger = logging.getLogger(__name__)

DEFAULT_SPREADSHEET_ID = "1y6gq6KYHB0dBLsSHcbH-nO5zQ-9iOn9Kk-vQiAvGdOo"
DEFAULT_GID = "791427930"

# Stage mapping dictionary
STAGE_MAP: Dict[str, LeadStage] = {
    "targeted": LeadStage.new_lead,
    "new lead": LeadStage.new_lead,
    "lead": LeadStage.new_lead,
    "contacted": LeadStage.new_lead,
    "connection sent": LeadStage.new_lead,
    "in conversation": LeadStage.new_lead,
    "engaged": LeadStage.new_lead,
    "chatting": LeadStage.new_lead,
    "meeting scheduled": LeadStage.discovery_call_booked,
    "call scheduled": LeadStage.discovery_call_booked,
    "discovery call booked": LeadStage.discovery_call_booked,
    "meeting done": LeadStage.discovery_done,
    "discovery done": LeadStage.discovery_done,
    "proposal": LeadStage.proposal_sent,
    "proposal sent": LeadStage.proposal_sent,
    "negotiation": LeadStage.negotiation,
    "won": LeadStage.won,
    "client": LeadStage.active_client,
    "active client": LeadStage.active_client,
    "closed won": LeadStage.won,
    "lost": LeadStage.lost,
    "not interested": LeadStage.lost,
    "closed lost": LeadStage.lost,
    "onboarding": LeadStage.onboarding,
    "upsell": LeadStage.upsell,
    "referral": LeadStage.referral,
}


def normalize_string(s: Optional[str]) -> str:
    if not s:
        return ""
    return s.strip()


def normalize_linkedin_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip().rstrip("/")
    # Clean query parameters
    if "?" in url:
        url = url.split("?")[0]
    return url if "linkedin.com" in url.lower() else url


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str or not date_str.strip():
        return None
    cleaned = date_str.strip()
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"]:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


def fetch_sheet_csv_rows(spreadsheet_id: str, gid: str = "0") -> List[Dict[str, str]]:
    """
    Fetches public or published Google Sheet data as CSV and parses into list of dicts.
    """
    url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            csv_text = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Failed to fetch Google Sheet CSV: {e}")
        raise ValueError(f"Could not connect to Google Sheet. Ensure the sheet is shared or accessible. ({e})")

    reader = csv.reader(io.StringIO(csv_text))
    raw_rows = [r for r in reader if any(cell.strip() for cell in r)]
    
    if not raw_rows:
        return []

    # Find the header row (must contain prospect/name and stage/linkedin/date/company)
    header_idx = -1
    for i, row in enumerate(raw_rows[:10]):
        row_lower = [c.lower().strip() for c in row if c]
        has_name = any("prospect" in c or "name" in c for c in row_lower)
        has_meta = any("stage" in c or "linkedin" in c or "date" in c or "company" in c for c in row_lower)
        if has_name and has_meta:
            header_idx = i
            break

    if header_idx == -1:
        header_idx = 0

    headers = [h.strip() for h in raw_rows[header_idx]]
    results = []
    
    for row_values in raw_rows[header_idx + 1:]:
        row_dict = {}
        for idx, header in enumerate(headers):
            if header and idx < len(row_values):
                row_dict[header] = row_values[idx].strip()
        
        # Only add rows that have at least a name or linkedin URL or company
        has_content = bool(
            row_dict.get("Prospect Name") 
            or row_dict.get("LinkedIn URL") 
            or row_dict.get("Company") 
            or row_dict.get("Role / Company")
        )
        if has_content:
            results.append(row_dict)

    return results


def sync_google_sheet_to_crm(
    db: Session,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    spreadsheet_id: str = DEFAULT_SPREADSHEET_ID,
    gid: str = DEFAULT_GID,
) -> Dict[str, Any]:
    """
    Pulls rows from Google Sheet and synchronizes them into the CRM leads table.
    """
    rows = fetch_sheet_csv_rows(spreadsheet_id, gid)
    
    created_count = 0
    updated_count = 0
    unchanged_count = 0
    errors = []

    # Fetch existing leads for deduplication
    from app.models.user import User
    if not user_id:
        first_u = db.query(User).first()
        if first_u:
            user_id = first_u.id
            if not tenant_id:
                tenant_id = first_u.tenant_id

    existing_leads = db.query(Lead).all()
    leads_by_linkedin = {}
    leads_by_name = {}

    for l in existing_leads:
        if l.linkedin_url:
            leads_by_linkedin[normalize_linkedin_url(l.linkedin_url)] = l
        if l.full_name:
            leads_by_name[l.full_name.lower().strip()] = l

    for idx, row in enumerate(rows):
        try:
            prospect_name = (
                row.get("Prospect Name") 
                or row.get("Full Name") 
                or row.get("Name") 
                or "Unknown Prospect"
            ).strip()

            role_company = row.get("Role / Company", "").strip()
            company_name = row.get("Company", "").strip()
            if not company_name and role_company:
                # If "CEO - Acme Corp", extract "Acme Corp"
                if " - " in role_company:
                    company_name = role_company.split(" - ")[-1].strip()
                elif "/" in role_company:
                    company_name = role_company.split("/")[-1].strip()
                else:
                    company_name = role_company

            raw_stage = row.get("Stage", "New Lead").lower().strip()
            stage = STAGE_MAP.get(raw_stage, LeadStage.new_lead)
            
            raw_linkedin = row.get("LinkedIn URL", "")
            linkedin_url = normalize_linkedin_url(raw_linkedin)

            icp_segment = row.get("ICP Segment", "").strip()
            notes_str = row.get("Notes", "").strip()
            anamika_note = row.get("Note by Anamika", "").strip()
            next_step = row.get("Next Step", "").strip()
            next_step_date_str = row.get("Next Step Date", "").strip()
            next_step_date = parse_date(next_step_date_str)
            date_added_str = row.get("Date Added", "").strip()
            date_added = parse_date(date_added_str)
            profile_account = row.get("Profile (account)", "").strip()

            # Compile tags
            tags = []
            if icp_segment:
                tags.append(icp_segment)
            if profile_account:
                tags.append(f"Account: {profile_account}")

            # Check if lead exists
            matched_lead = None
            if linkedin_url and linkedin_url in leads_by_linkedin:
                matched_lead = leads_by_linkedin[linkedin_url]
            elif prospect_name.lower() in leads_by_name:
                matched_lead = leads_by_name[prospect_name.lower()]

            if matched_lead:
                # Update existing lead
                changed = False
                if company_name and matched_lead.company_name != company_name:
                    matched_lead.company_name = company_name
                    changed = True
                if linkedin_url and matched_lead.linkedin_url != linkedin_url:
                    matched_lead.linkedin_url = linkedin_url
                    changed = True
                if matched_lead.stage != stage:
                    old_stage = matched_lead.stage.value if matched_lead.stage else "None"
                    matched_lead.stage = stage
                    changed = True
                    # Record activity
                    db.add(Activity(
                        lead_id=matched_lead.id,
                        user_id=user_id,
                        activity_type=ActivityType.stage_change,
                        description=f"Stage updated to {stage.value} from Google Sheet sync",
                        meta_data={"old_stage": old_stage, "new_stage": stage.value, "source": "google_sheet"}
                    ))
                
                # Check for new notes
                combined_notes = []
                if notes_str:
                    combined_notes.append(f"Sheet Notes: {notes_str}")
                if anamika_note:
                    combined_notes.append(f"Note by Team: {anamika_note}")

                if combined_notes and user_id:
                    note_content = "\n".join(combined_notes)
                    # Check if note already exists
                    existing_note = db.query(Note).filter(
                        Note.lead_id == matched_lead.id,
                        Note.content == note_content
                    ).first()
                    if not existing_note:
                        db.add(Note(
                            lead_id=matched_lead.id,
                            author_id=user_id,
                            tenant_id=tenant_id,
                            content=note_content
                        ))
                        changed = True

                # Check for Next Step Task
                if next_step:
                    existing_task = db.query(Task).filter(
                        Task.lead_id == matched_lead.id,
                        Task.title == next_step
                    ).first()
                    if not existing_task:
                        db.add(Task(
                            lead_id=matched_lead.id,
                            assigned_to=user_id,
                            tenant_id=tenant_id,
                            title=next_step,
                            task_type=TaskType.follow_up,
                            due_date=next_step_date,
                            description=f"Synced from Google Sheet next step for {prospect_name}"
                        ))
                        changed = True

                if changed:
                    matched_lead.updated_at = datetime.now(timezone.utc)
                    updated_count += 1
                else:
                    unchanged_count += 1

            else:
                # Create New Lead
                new_lead = Lead(
                    full_name=prospect_name,
                    company_name=company_name,
                    company_industry=icp_segment or "LinkedIn Prospect",
                    linkedin_url=linkedin_url,
                    source=LeadSource.linkedin,
                    priority=LeadPriority.warm,
                    stage=stage,
                    tags=tags,
                    tenant_id=tenant_id,
                    added_by_id=user_id,
                    created_at=date_added or datetime.now(timezone.utc),
                )
                db.add(new_lead)
                db.flush()

                # Register activity
                db.add(Activity(
                    lead_id=new_lead.id,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    activity_type=ActivityType.lead_created,
                    description=f"Prospect '{prospect_name}' imported via Google Sheets live sync",
                    meta_data={"source": "google_sheet_sync", "stage": stage.value}
                ))

                # Add Note if present
                combined_notes = []
                if notes_str:
                    combined_notes.append(f"Sheet Notes: {notes_str}")
                if anamika_note:
                    combined_notes.append(f"Note by Team: {anamika_note}")

                if combined_notes and user_id:
                    db.add(Note(
                        lead_id=new_lead.id,
                        author_id=user_id,
                        tenant_id=tenant_id,
                        content="\n".join(combined_notes)
                    ))

                # Add Follow-up Task if present
                if next_step:
                    db.add(Task(
                        lead_id=new_lead.id,
                        assigned_to=user_id,
                        tenant_id=tenant_id,
                        title=next_step,
                        task_type=TaskType.follow_up,
                        due_date=next_step_date,
                        description=f"Imported from Google Sheet for {prospect_name}"
                    ))

                created_count += 1
                if linkedin_url:
                    leads_by_linkedin[linkedin_url] = new_lead
                leads_by_name[prospect_name.lower()] = new_lead

        except Exception as err:
            logger.warning(f"Error processing row {idx}: {err}")
            errors.append(f"Row {idx+2} ({row.get('Prospect Name', 'Unknown')}): {str(err)}")

    db.commit()

    return {
        "success": True,
        "total_rows_processed": len(rows),
        "created_leads": created_count,
        "updated_leads": updated_count,
        "unchanged_leads": unchanged_count,
        "errors": errors,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def process_sheet_webhook_event(
    db: Session,
    payload: Dict[str, Any],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Handles incoming real-time webhooks sent by Google Apps Script onEdit trigger.
    """
    from app.models.user import User
    if not user_id:
        first_u = db.query(User).first()
        if first_u:
            user_id = first_u.id
            if not tenant_id:
                tenant_id = first_u.tenant_id

    action = payload.get("action", "edit")
    data = payload.get("data", {})
    
    prospect_name = data.get("Prospect Name") or data.get("name")
    linkedin_url = normalize_linkedin_url(data.get("LinkedIn URL") or data.get("linkedin"))
    company = data.get("Company") or data.get("Role / Company") or ""
    raw_stage = (data.get("Stage") or "New Lead").lower().strip()
    stage = STAGE_MAP.get(raw_stage, LeadStage.new_lead)
    notes_str = data.get("Notes") or ""
    next_step = data.get("Next Step") or ""

    if not prospect_name and not linkedin_url:
        return {"status": "ignored", "reason": "No prospect name or LinkedIn URL provided"}

    # Find existing lead
    lead = None
    if linkedin_url:
        lead = db.query(Lead).filter(Lead.linkedin_url == linkedin_url).first()
    if not lead and prospect_name:
        lead = db.query(Lead).filter(Lead.full_name == prospect_name).first()

    if lead:
        # Update existing
        if company:
            lead.company_name = company
        lead.stage = stage
        lead.updated_at = datetime.now(timezone.utc)
        
        if notes_str and user_id:
            db.add(Note(
                lead_id=lead.id,
                author_id=user_id,
                tenant_id=tenant_id,
                content=f"[Google Sheet Update]: {notes_str}"
            ))

        db.add(Activity(
            lead_id=lead.id,
            user_id=user_id,
            tenant_id=tenant_id,
            activity_type=ActivityType.stage_change,
            description=f"Real-time update received from Google Sheet (Stage: {stage.value})",
            meta_data={"stage": stage.value, "source": "google_sheet_webhook"}
        ))
        db.commit()
        return {"status": "updated", "lead_id": lead.id, "name": lead.full_name}
    else:
        # Create new lead
        new_lead = Lead(
            full_name=prospect_name or "New Prospect",
            company_name=company,
            linkedin_url=linkedin_url,
            stage=stage,
            source=LeadSource.linkedin,
            priority=LeadPriority.warm,
            tenant_id=tenant_id,
            added_by_id=user_id,
        )
        db.add(new_lead)
        db.flush()

        if notes_str and user_id:
            db.add(Note(
                lead_id=new_lead.id,
                author_id=user_id,
                tenant_id=tenant_id,
                content=f"[Google Sheet]: {notes_str}"
            ))

        if next_step:
            db.add(Task(
                lead_id=new_lead.id,
                assigned_to=user_id,
                tenant_id=tenant_id,
                title=next_step,
                task_type=TaskType.follow_up,
                description="Imported from Google Sheet real-time webhook"
            ))

        db.add(Activity(
            lead_id=new_lead.id,
            user_id=user_id,
            tenant_id=tenant_id,
            activity_type=ActivityType.lead_created,
            description=f"Lead '{new_lead.full_name}' created via Google Sheet real-time webhook",
            meta_data={"source": "google_sheet_webhook"}
        ))
        db.commit()
        return {"status": "created", "lead_id": new_lead.id, "name": new_lead.full_name}


def generate_google_apps_script_code(webhook_url: str) -> str:
    """
    Generates ready-to-paste Google Apps Script code for 2-way real-time sync.
    """
    return f"""/**
 * Growpido CRM — Google Sheets 2-Way Real-Time Sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Google Sheet, click 'Extensions' > 'Apps Script'
 * 2. Delete any code in the editor and paste this ENTIRE script
 * 3. Click 'Save' (💾 icon)
 * 4. Click 'Triggers' (⏰ clock icon on left sidebar) > '+ Add Trigger'
 *    - Choose function: 'installedOnEdit'
 *    - Event source: 'From spreadsheet'
 *    - Event type: 'On edit'
 *    - Save and grant permissions
 * 5. You will also get a custom menu '⚡ Growpido CRM' in your spreadsheet header to Sync All!
 */

const GROWPIDO_WEBHOOK_URL = "{webhook_url}";

function onOpen() {{
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Growpido CRM')
    .addItem('🚀 Sync Entire Sheet to CRM Now', 'manualSyncAllToCRM')
    .addToUi();
}}

function installedOnEdit(e) {{
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  
  // Skip header rows
  if (row <= 2) return;
  
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rowData = {{}};
  headers.forEach((header, idx) => {{
    if (header) {{
      rowData[header.toString().trim()] = rowValues[idx];
    }}
  }});

  // Send real-time webhook
  try {{
    const payload = JSON.stringify({{
      action: 'edit',
      row: row,
      data: rowData,
      timestamp: new Date().toISOString()
    }});

    const options = {{
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    }};

    UrlFetchApp.fetch(GROWPIDO_WEBHOOK_URL, options);
  }} catch (err) {{
    Logger.log('Growpido Webhook Error: ' + err);
  }}
}}

function manualSyncAllToCRM() {{
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 2) {{
    SpreadsheetApp.getUi().alert('No data rows found to sync.');
    return;
  }}

  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const dataRows = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  
  let syncedCount = 0;
  dataRows.forEach((rowValues, idx) => {{
    const rowData = {{}};
    headers.forEach((header, hIdx) => {{
      if (header) rowData[header.toString().trim()] = rowValues[hIdx];
    }});
    
    if (rowData['Prospect Name'] || rowData['LinkedIn URL']) {{
      try {{
        UrlFetchApp.fetch(GROWPIDO_WEBHOOK_URL, {{
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({{ action: 'sync_row', row: idx + 3, data: rowData }}),
          muteHttpExceptions: true
        }});
        syncedCount++;
      }} catch (e) {{}}
    }}
  }});

  SpreadsheetApp.getUi().alert('✓ Successfully synced ' + syncedCount + ' leads to Growpido CRM!');
}}
"""
