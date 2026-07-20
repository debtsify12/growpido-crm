"""
Growpido CRM — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import create_all_tables
from app.services.scheduler import start_scheduler, stop_scheduler
from app.routers import auth, leads, tasks, notes, users, dashboard, import_export
from app.routers import tenants, people


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_all_tables()
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
    - Ensures existing admin@growpido.com is tenant admin
    """
    from app.database import SessionLocal
    from app.models.tenant import Tenant
    from app.models.user import User, UserRole
    from app.core.auth import get_password_hash

    db = SessionLocal()
    try:
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
            User.role != UserRole.super_admin,
        ).all()

        for user in unassigned_users:
            user.tenant_id = default_tenant.id
            if user.role == UserRole.member:
                # Old 'admin' role maps to new 'admin'
                pass

        # 4. Migrate existing leads, tasks, notes, activities to default tenant
        from app.models.lead import Lead
        from app.models.task import Task
        from app.models.note import Note
        from app.models.activity import Activity

        db.query(Lead).filter(Lead.tenant_id.is_(None)).update(
            {"tenant_id": default_tenant.id}
        )
        db.query(Task).filter(Task.tenant_id.is_(None)).update(
            {"tenant_id": default_tenant.id}
        )
        db.query(Note).filter(Note.tenant_id.is_(None)).update(
            {"tenant_id": default_tenant.id}
        )
        db.query(Activity).filter(Activity.tenant_id.is_(None)).update(
            {"tenant_id": default_tenant.id}
        )

        # 5. Create default admin if no tenant admin exists
        existing_admin = db.query(User).filter(
            User.tenant_id == default_tenant.id,
            User.role == UserRole.admin,
        ).first()
        if not existing_admin:
            admin = User(
                name="Growpido Admin",
                email="admin@growpido.com",
                hashed_password=get_password_hash("Growpido@2024"),
                role=UserRole.admin,
                tenant_id=default_tenant.id,
                designation="CRM Administrator",
                employee_id="EMP-001",
            )
            db.add(admin)

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


@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "2.0.0"}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "version": "2.0.0"}
