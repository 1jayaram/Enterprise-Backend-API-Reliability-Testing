# Workload Control — React + TypeScript Frontend

A dark enterprise dashboard for the Enterprise Backend & API Reliability Testing portfolio project.

## 1. Requirements

- Node.js 20 LTS or newer
- npm
- Your existing FastAPI backend (for live integration)

Check versions:

```powershell
node --version
npm --version
```

## 2. Install and run

Open this folder in VS Code. In the integrated PowerShell terminal:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:5173**. Keep the terminal running.

## 3. Demo mode and live API mode

The starter is intentionally configured with `VITE_DEMO_MODE=true`. It uses clearly labelled sample records so you can inspect the frontend before all backend endpoints are implemented. It does not claim those values are live.

When your backend endpoints are ready, edit `.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_DEMO_MODE=false
```

Restart Vite after changing `.env` (Ctrl+C, then `npm run dev`).

## 4. Expected backend contract

The frontend currently expects these routes:

| Method | Route | Expected result |
|---|---|---|
| GET | `/health` | `{ "status": "healthy", "service": "workload-api" }` |
| POST | `/api/v1/auth/login` | `{ "access_token": "...", "token_type": "bearer" }` |
| GET | `/api/v1/jobs` | `Job[]` or `{ "items": Job[] }` |
| POST | `/api/v1/jobs` | Created `Job` |
| POST | `/api/v1/jobs/{id}/cancel` | 200/204 response |
| GET | `/api/v1/admin/users` | Admin-only user array (not yet displayed) |

Job JSON fields:

```json
{
  "id": "UUID-or-string",
  "job_name": "Data processing",
  "status": "queued",
  "priority": "normal",
  "cpu_cores": 4,
  "memory_gb": 8,
  "created_at": "2026-11-04T12:00:00Z",
  "owner": "operator"
}
```

The `status` values are `queued`, `running`, `completed`, `failed`, `cancelled`. Priority values are `low`, `normal`, `high`.

### Login compatibility

This frontend sends JSON `{ "username": "...", "password": "..." }` to `/api/v1/auth/login`. If your FastAPI login endpoint uses OAuth2 form data (`OAuth2PasswordRequestForm`), update `api.ts` to send `URLSearchParams` with `application/x-www-form-urlencoded`, or implement a JSON login schema on the backend.

### Cancellation compatibility

This frontend calls `POST /api/v1/jobs/{id}/cancel`. Make your FastAPI route match this contract, or change the URL in `src/api.ts`.

## 5. Development notes

- The browser never connects directly to PostgreSQL.
- JWT access tokens are stored in localStorage for this local portfolio starter. For production, prefer secure HttpOnly cookies, CSRF protection, token expiry/refresh handling, and stricter security controls.
- Metrics and charts in the Overview/Monitoring pages are illustrative until connected to real telemetry endpoints.
- Reliability reports intentionally show “Not connected” rather than inventing test coverage or Locust results.
- A job marked queued/running will only change state if your backend worker updates the database. The UI is not a job scheduler.

## 6. Production build

```powershell
npm run build
npm run preview
```

Build output is created in `dist/`.
