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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_all_tables()
    _seed_admin_if_needed()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


def _seed_admin_if_needed():
    """Create default admin user if no users exist."""
    from app.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.auth import get_password_hash

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                name="Growpido Admin",
                email="admin@growpido.com",
                hashed_password=get_password_hash("Growpido@2024"),
                role=UserRole.admin,
            )
            db.add(admin)
            db.commit()
            print("Default admin created: admin@growpido.com / Growpido@2024")
    finally:
        db.close()


app = FastAPI(
    title="Growpido CRM API",
    description="In-house CRM for Growpido — full lead lifecycle management",
    version="1.0.0",
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
app.include_router(leads.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(import_export.router)


@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "version": "1.0.0"}
