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
    _scheduler.start()
    logger.info("[Scheduler] Started — stuck-lead check runs every hour (Google Sheets auto-sync disabled)")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
