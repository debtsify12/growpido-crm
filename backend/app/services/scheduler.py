"""
APScheduler background jobs
============================
Runs stuck-lead detection every hour.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler = None


def _run_stuck_lead_check():
    """Wrapped job — creates its own DB session."""
    from app.database import SessionLocal
    from app.services.automation import check_and_alert_stuck_leads

    db = SessionLocal()
    try:
        count = check_and_alert_stuck_leads(db)
        if count:
            logger.info(f"[Scheduler] Stuck-lead alert: {count} leads flagged")
    except Exception as e:
        logger.error(f"[Scheduler] Stuck-lead check failed: {e}")
    finally:
        db.close()


def _run_google_sheets_sync():
    """Background auto-sync with configured Google Sheets."""
    from app.database import SessionLocal
    from app.services.google_sheets import sync_google_sheet_to_crm, DEFAULT_SPREADSHEET_ID, DEFAULT_GID
    from app.models.user import User

    db = SessionLocal()
    try:
        user = db.query(User).first()
        result = sync_google_sheet_to_crm(
            db=db,
            tenant_id=user.tenant_id if user else None,
            user_id=user.id if user else None,
            spreadsheet_id=DEFAULT_SPREADSHEET_ID,
            gid=DEFAULT_GID,
        )
        if result.get("created_leads", 0) > 0 or result.get("updated_leads", 0) > 0:
            logger.info(f"[Scheduler] Google Sheets auto-sync: +{result['created_leads']} created, ~{result['updated_leads']} updated")
    except Exception as e:
        logger.warning(f"[Scheduler] Google Sheets auto-sync failed: {e}")
    finally:
        db.close()


def start_scheduler():
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _run_stuck_lead_check,
        trigger=IntervalTrigger(hours=1),
        id="stuck_lead_check",
        name="Stuck Lead Check",
        replace_existing=True,
    )
    _scheduler.add_job(
        _run_google_sheets_sync,
        trigger=IntervalTrigger(minutes=15),
        id="google_sheets_sync",
        name="Google Sheets Auto-Sync",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("[Scheduler] Started — stuck-lead check runs every hour, Google Sheets sync runs every 15m")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
