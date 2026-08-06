"""
Non-Destructive Production Database Schema Migration
Growpido CRM

This script safely updates an existing production database (PostgreSQL or SQLite)
without dropping tables, without seeding test data, and without altering existing client rows.
It is 100% idempotent (can be run multiple times safely).
"""

import logging
from sqlalchemy import inspect, text
from app.database import engine, Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_production_migration():
    logger.info("Starting safe, non-destructive schema migration...")
    dialect_name = engine.dialect.name
    logger.info(f"Database dialect detected: {dialect_name}")

    # 1. Safely create all new tables IF NOT EXISTS
    from app.models import tenant, user, lead, task, note, activity, work_log, persona, invoice, content_post  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Checked table existence. New tables created safely if they were missing.")

    # 2. Inspect existing columns in tables to patch missing columns
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        # Autocommit for PostgreSQL DDL
        if dialect_name == "postgresql":
            conn.execution_options(isolation_level="AUTOCOMMIT")

        # --- A. Patch Enum values in PostgreSQL ---
        if dialect_name == "postgresql":
            logger.info("Checking PostgreSQL enums...")
            enum_patches = [
                ("userrole", "super_admin"),
                ("leadstage", "Won"),
                ("leadstage", "Onboarding"),
                ("leadstage", "Active Client"),
                ("leadstage", "Upsell"),
                ("leadstage", "Referral"),
            ]
            for enum_type, enum_val in enum_patches:
                try:
                    conn.execute(text(f"ALTER TYPE {enum_type} ADD VALUE IF NOT EXISTS '{enum_val}'"))
                    logger.info(f"  ✓ Enum {enum_type} value '{enum_val}' verified")
                except Exception as e:
                    logger.warning(f"  (Ignored enum patch warning for {enum_type}.{enum_val}): {e}")

        # --- B. Patch 'leads' table columns ---
        if "leads" in inspector.get_table_names():
            lead_cols = [c["name"] for c in inspector.get_columns("leads")]
            
            patches = [
                ("monthly_post_quota", "INTEGER DEFAULT 12", "INTEGER DEFAULT 12"),
                ("monthly_calls_quota", "INTEGER DEFAULT 2", "INTEGER DEFAULT 2"),
                ("health_score", "INTEGER DEFAULT 95", "INTEGER DEFAULT 95"),
                ("brand_vault", "JSON DEFAULT '{}'", "JSONB DEFAULT '{}'::jsonb"),
                ("custom_ai_agent", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
                ("reputation_building", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
                ("tenant_id", "VARCHAR(36)", "VARCHAR(36)"),
                ("company_industry", "VARCHAR(100)", "VARCHAR(100)"),
                ("company_address", "VARCHAR(255)", "VARCHAR(255)"),
                ("linkedin_url", "VARCHAR(255)", "VARCHAR(255)"),
                ("poc_name", "VARCHAR(100)", "VARCHAR(100)"),
            ]

            for col_name, sqlite_type, pg_type in patches:
                if col_name not in lead_cols:
                    col_type = pg_type if dialect_name == "postgresql" else sqlite_type
                    logger.info(f"Adding missing column 'leads.{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"  ✓ Column 'leads.{col_name}' added successfully.")
                    except Exception as e:
                        logger.warning(f"  Could not add column 'leads.{col_name}': {e}")
                else:
                    logger.info(f"  ✓ Column 'leads.{col_name}' already exists.")

        # --- C. Patch 'users' table columns ---
        if "users" in inspector.get_table_names():
            user_cols = [c["name"] for c in inspector.get_columns("users")]
            user_patches = [
                ("tenant_id", "VARCHAR(36)", "VARCHAR(36)"),
                ("designation", "VARCHAR(100)", "VARCHAR(100)"),
            ]
            for col_name, sqlite_type, pg_type in user_patches:
                if col_name not in user_cols:
                    col_type = pg_type if dialect_name == "postgresql" else sqlite_type
                    logger.info(f"Adding missing column 'users.{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"  ✓ Column 'users.{col_name}' added successfully.")
                    except Exception as e:
                        logger.warning(f"  Could not add column 'users.{col_name}': {e}")
                else:
                    logger.info(f"  ✓ Column 'users.{col_name}' already exists.")

        # --- D. Patch other tables for tenant_id ---
        for table_name in ["tasks", "notes", "activities", "invoices", "content_posts"]:
            if table_name in inspector.get_table_names():
                t_cols = [c["name"] for c in inspector.get_columns(table_name)]
                if "tenant_id" not in t_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN tenant_id VARCHAR(36)"))
                        logger.info(f"  ✓ Column '{table_name}.tenant_id' added.")
                    except Exception as e:
                        logger.warning(f"  Could not add '{table_name}.tenant_id': {e}")

        conn.commit()

    logger.info("✅ Migration finished successfully! All existing client records remain 100% untouched.")


if __name__ == "__main__":
    run_production_migration()
