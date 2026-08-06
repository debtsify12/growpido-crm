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
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 15}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(db_url, **engine_kwargs)

if is_sqlite:
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

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
    import os
    import time
    import tempfile
    from sqlalchemy import inspect

    # Concurrency lock for Gunicorn multi-worker environment
    lock_dir = os.path.join(tempfile.gettempdir(), "growpido_migration.lock")
    try:
        os.mkdir(lock_dir)
    except FileExistsError:
        print("Another worker is currently running migrations. Waiting...")
        time.sleep(10)
        return

    try:
        # Run safe non-destructive migration for existing tables and new columns
        try:
            from app.migrate_production import run_production_migration
            run_production_migration()
        except Exception as e:
            print(f"Non-destructive migration error: {e}")

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
    finally:
        # Clean up lock
        try:
            os.rmdir(lock_dir)
        except Exception:
            pass
