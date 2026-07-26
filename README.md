# 🚀 Growpido CRM

In-house CRM for Growpido. End-to-end lead lifecycle management — from New Lead → Referral.

**Stack**: Python FastAPI + PostgreSQL (backend) · Next.js 14 TypeScript (frontend)  
**Deploy**: Render (API) + Vercel (Frontend)

---

## Quick Start (Local Dev)

### 1. Backend

```bash
cd backend

# Create virtual env
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install deps
pip install -r requirements.txt

# Create .env from template
copy .env.example .env
# Edit .env — set your DATABASE_URL (local PostgreSQL)

# Run dev server
python run.py
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**Super admin** is auto-created on first run:
- Email: `Founder@growpido.com`
- Password: `Growpido@2026`

### 2. Frontend

```bash
cd frontend

# Install deps (already done)
npm install

# Run dev server
npm run dev
# Runs at http://localhost:3000
```

---

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@localhost:5432/growpido_crm
SECRET_KEY=your-super-secret-key-min-32-chars
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Features

| Feature | Status |
|---|---|
| Sales Pipeline (Kanban, 11 stages) | ✅ |
| Drag & Drop between stages | ✅ |
| Lead Profile (single source of truth) | ✅ |
| Stage change → auto task creation | ✅ |
| Stuck lead alerts (7-day no activity) | ✅ |
| My Day tasks view | ✅ |
| Activity timeline | ✅ |
| Internal notes | ✅ |
| Role-based access (Admin / Member) | ✅ |
| Dashboard + Charts | ✅ |
| CSV Import from Google Sheets | ✅ |
| CSV Export | ✅ |
| JWT Authentication | ✅ |

---

## Pipeline Stages

1. New Lead
2. Discovery Call Booked
3. Discovery Done
4. Proposal Sent
5. Negotiation
6. Won
7. Onboarding
8. Active Client
9. Upsell
10. Referral
11. Lost

---

## Deploy to Render + Vercel

### Render (Backend)
1. Connect GitHub repo to Render
2. Create **Web Service** pointing to `/backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard
6. Add a **PostgreSQL** database on Render — copy the Internal Database URL to `DATABASE_URL`

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set Root Directory to `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Update `vercel.json` with actual Render URL

---

## API Docs

When backend is running: `http://localhost:8000/docs` (Swagger UI auto-generated)

### Key Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/leads` | List all leads (with filters) |
| POST | `/api/leads` | Create lead |
| POST | `/api/leads/{id}/stage` | Change stage (triggers automations) |
| GET | `/api/tasks` | List tasks (with due_today, overdue filters) |
| POST | `/api/import/csv` | Import from Google Sheets CSV |
| GET | `/api/dashboard/overview` | KPI stats |

---

## Google Sheets Migration

Export your existing Google Sheet as CSV (File → Download → CSV).

Import at: **Leads page → Import CSV button**

Required columns: `full_name` (required), `phone`, `email`, `company_name`, `city`, `budget`, `source`, `stage`
