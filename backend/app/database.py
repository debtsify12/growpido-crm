from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Handle Render's postgres:// connection strings
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

is_sqlite = db_url.startswith("sqlite")
engine_kwargs = {"pool_pre_ping": True}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all tables — called on startup."""
    from app.models import tenant, user, lead, task, note, activity, work_log  # noqa: F401
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass

    # Add new columns to existing tables if they don't exist (SQLite migration)
    if is_sqlite:
        _run_sqlite_migrations()


def _run_sqlite_migrations():
    """Add missing columns to existing SQLite tables without dropping data."""
    migrations = [
        # Tenants table already created fresh — no migration needed
        # Users table
        ("users", "tenant_id", "TEXT REFERENCES tenants(id)"),
        ("users", "employee_id", "TEXT"),
        ("users", "phone", "TEXT"),
        ("users", "department", "TEXT"),
        ("users", "designation", "TEXT"),
        ("users", "bio", "TEXT"),
        ("users", "join_date", "DATETIME"),
        ("users", "updated_at", "DATETIME"),
        # Leads table
        ("leads", "tenant_id", "TEXT REFERENCES tenants(id)"),
        # Tasks table
        ("tasks", "tenant_id", "TEXT REFERENCES tenants(id)"),
        # Notes table
        ("notes", "tenant_id", "TEXT REFERENCES tenants(id)"),
        # Activities table
        ("activities", "tenant_id", "TEXT REFERENCES tenants(id)"),
    ]

    with engine.connect() as conn:
        for table, column, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists — skip
