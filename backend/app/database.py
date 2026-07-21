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


def run_migrations():
    """Run Alembic migrations automatically on startup."""
    import subprocess
    import sys
    from sqlalchemy import inspect

    # Create tables for brand new databases
    from app.models import tenant, user, lead, task, note, activity, work_log  # noqa: F401
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Error creating tables: {e}")

    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Command to run alembic using the current python executable
        alembic_cmd = [sys.executable, "-c", "from alembic.config import main; main()"]

        # If the database already had tables but isn't tracked by Alembic, stamp it
        if "users" in tables and "alembic_version" not in tables:
            print("Adopting existing database for Alembic...")
            subprocess.run(alembic_cmd + ["stamp", "head"], check=False)

        print("Running Alembic migrations...")
        subprocess.run(alembic_cmd + ["upgrade", "head"], check=False)
    except Exception as e:
        print(f"Migration error (ignored): {e}")
