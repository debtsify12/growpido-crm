"""
Growpido CRM — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import run_migrations
from app.services.scheduler import start_scheduler, stop_scheduler
from app.routers import auth, leads, tasks, notes, users, dashboard, import_export, content
from app.routers import tenants, people, personas


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TEMPORARY: Reset the entire database (Drop all tables)
    import logging
    logging.warning("DROPPING ALL TABLES TO RESET DATABASE!")
    from app.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    
    # Startup
    run_migrations()
    _seed_default_tenant_and_super_admin()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


def _seed_default_tenant_and_super_admin():
    """
    Create the default tenant and seed users if they don't exist.
    - Creates a 'Growpido' default tenant
    - Migrates existing users to this tenant
    - Creates the super_admin user
    """
    from app.database import SessionLocal
    from app.models.tenant import Tenant
    from app.models.user import User, UserRole
    from app.core.auth import get_password_hash

    from sqlalchemy import text

    db = SessionLocal()
    try:
        if db.bind.dialect.name == "postgresql":
            try:
                with db.bind.execution_options(isolation_level="AUTOCOMMIT").connect() as conn:
                    conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin'"))
            except Exception as e:
                print(f"Enum patch error (ignored): {e}")

        # 1. Create default tenant if it doesn't exist
        default_tenant = db.query(Tenant).filter(Tenant.slug == "growpido").first()
        if not default_tenant:
            default_tenant = Tenant(
                name="Growpido",
                slug="growpido",
            )
            db.add(default_tenant)
            db.commit()
            db.refresh(default_tenant)
            print(f"Default tenant created: {default_tenant.name} ({default_tenant.id})")

        # 2. Create super_admin if none exists
        super_admin = db.query(User).filter(User.role == UserRole.super_admin).first()
        if not super_admin:
            super_admin = User(
                name="Super Admin",
                email=settings.SUPER_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
                role=UserRole.super_admin,
                tenant_id=None,  # Super admin is not tied to any tenant
                designation="System Administrator",
            )
            db.add(super_admin)
            db.commit()
            print(f"Super admin created: {settings.SUPER_ADMIN_EMAIL}")

        # 3. Migrate any existing users without tenant_id to the default tenant
        unassigned_users = db.query(User).filter(
            User.tenant_id.is_(None),
            User.role != UserRole.super_admin
        ).all()
        for u in unassigned_users:
            u.tenant_id = default_tenant.id
        if unassigned_users:
            db.commit()
            print(f"Migrated {len(unassigned_users)} users to default tenant.")
            
        # 4. Migrate existing leads, tasks, notes, activities to default tenant
        from app.models.lead import Lead
        from app.models.task import Task
        from app.models.note import Note
        from app.models.activity import Activity
        
        for model, name in [(Lead, "leads"), (Task, "tasks"), (Note, "notes"), (Activity, "activities")]:
            db.query(model).filter(model.tenant_id.is_(None)).update(
                {"tenant_id": default_tenant.id}, synchronize_session=False
            )
        db.commit()

        db.commit()
        print("Database seeding complete.")

    except Exception as e:
        print(f"Seeding error (non-fatal): {e}")
        db.rollback()
    finally:
        db.close()


app = FastAPI(
    title="Growpido CRM API",
    description="Production CRM — multi-tenant, role-based lead and team management",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(people.router)
app.include_router(users.router)
app.include_router(leads.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(dashboard.router)
app.include_router(import_export.router)
app.include_router(content.router)
app.include_router(personas.router)


@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "2.0.0"}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "version": "2.0.0"}
