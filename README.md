# 🚀 Growpido CRM

Enterprise CRM and Client Management System for Growpido. End-to-end lead lifecycle management, client retainers, invoice generation, LinkedIn AI content strategy, automated task workflows, and multi-tenant team management.

**Stack**:
- **Backend**: FastAPI (Python 3.11) + SQLAlchemy + PostgreSQL / SQLite + APScheduler + JWT Auth
- **Frontend**: Next.js 16 (Turbopack / App Router) + React 19 + TypeScript + Zustand + Recharts + dnd-kit
- **Deployment Ready**: Docker & Docker Compose · Vercel · Render · Any Cloud VPS

---

## ⚡ Quick Start (Local Development)

### 1. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run development server
python run.py
# API running at http://localhost:8000
# Swagger API docs at http://localhost:8000/docs
```

**Default Admin Credentials**:
- **Email**: `Founder@growpido.com`
- **Password**: `Growpido@2026`

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Web app running at http://localhost:3000
```

---

## 🐳 1-Click Docker Deployment

Run the entire CRM (PostgreSQL database + FastAPI backend + Next.js frontend) with a single command:

```bash
docker compose up -d --build
```

Access the app at `http://localhost:3000` and API at `http://localhost:8000`.

---

## 🌐 Production Cloud Deployment Guide

### A. Deploy Backend to Render

1. Create a **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker`
4. Add Environment Variables:
   - `DATABASE_URL`: PostgreSQL connection string (e.g. from Render PostgreSQL)
   - `SECRET_KEY`: Random 64-character string
   - `ALLOWED_ORIGINS`: `https://your-frontend-domain.vercel.app`
   - `OPENAI_API_KEY`: *(Optional)* for AI Content Strategist

---

### B. Deploy Frontend to Vercel

1. Import repository on [Vercel](https://vercel.com).
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com`

---

## ✨ Features & Architecture

| Module | Features & Capabilities | Status |
|---|---|---|
| **Invoice Generator** | Sovereign Blue template with Growpido shield logo, dual-pane live preview, itemized deliverables, taxes & discounts, bank UPI transfer details, isolated A4 PDF print/save engine, status workflow (Draft → Sent → Paid). | ✅ Ready |
| **Sales Pipeline** | 11-stage Kanban board with smooth drag-and-drop (`@dnd-kit`), stage-level financial metrics, and automated follow-up tasks. | ✅ Ready |
| **Current Clients** | Dedicated active client management with ARR, MRR, ARPU metrics, service tags (Reputation Building, Custom AI Agent), and direct billing drawers. | ✅ Ready |
| **Lead Profiles** | Unified 360° lead timeline, custom notes, linked invoices, one-click stage change, task checklist, and activity logs. | ✅ Ready |
| **Content Strategist** | AI LinkedIn post analyzer, viral score algorithm, hook generators, and client persona library. | ✅ Ready |
| **My Day Tasks** | Smart task prioritization (Overdue, Due Today, Completed) with automated reminders. | ✅ Ready |
| **Team Directory** | Role-based permissions (`super_admin`, `admin`, `member`), employee directory, work log tracker, and activity feeds. | ✅ Ready |
| **Import & Export** | Clean CSV / Excel import and export for leads with error tolerance. | ✅ Ready |
| **Multi-Tenant System** | Multi-organization isolation, tenant administrative controls, and system-level dashboards. | ✅ Ready |

---

## 🔒 Security & Best Practices

- **JWT Authentication** with HTTP-only cookies and Bearer auth headers.
- **Tenant Isolation** on every query for multi-organization data protection.
- **SQLAlchemy ORM** with automated Alembic migrations on startup.
- **Strict TypeScript** type checking with 0 build warnings.
- **A4 Print Engine** with background color forcing for vector-grade PDF generation.
