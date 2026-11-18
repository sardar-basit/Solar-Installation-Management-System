# SIMS — Solar Installation Management System

Web application for managing solar customers, site surveys, system designs, quotations, installation projects, inventory, payments, maintenance, notifications, and reports.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth.js (credentials)
- Docker Compose for Postgres

## Quick start

### 1. Database

```bash
docker compose up -d db
# or use the already-running container on port 5433
```

### 2. Environment

Copy `.env` (already present for local dev):

```
DATABASE_URL="postgresql://sims:sims@localhost:5433/sims?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sims-dev-secret-change-in-production-32chars"
UPLOAD_DIR="./uploads"
EMAIL_FROM="noreply@sims.local"
```

Optional email: set `RESEND_API_KEY` or `SMTP_URL`. Set `EMAIL_ALL_ROLES=true` to email staff as well as customers.

### 3. Install, migrate, seed

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## Demo users

Password for all: `password123`

| Username / Email | Role |
|---|---|
| admin@sims.local | Admin |
| sales@sims.local | Sales |
| surveyor@sims.local | Site Surveyor |
| tech@sims.local | Installation Technician |
| pm@sims.local | Project Manager |
| accountant@sims.local | Accountant |
| inventory@sims.local | Inventory Manager |
| customer@sims.local | Customer (portal) |

## Functional coverage

| FR | Module | Path |
|---|---|---|
| FR-01 | Auth | `/login` |
| FR-02 | Customers | `/dashboard/customers` |
| FR-03 | Surveys | `/dashboard/surveys` |
| FR-04 | Designs | `/dashboard/designs` |
| FR-05 | Quotations | `/dashboard/quotations` (+ print) |
| FR-06 | Projects | `/dashboard/projects` |
| FR-07 | Installations | `/dashboard/installations` |
| FR-08 | Inventory | `/dashboard/inventory` |
| FR-09 | Payments | `/dashboard/payments` (+ receipt print) |
| FR-10 | Maintenance | `/dashboard/maintenance`, `/portal/maintenance` |
| FR-11 | Notifications | `/dashboard/notifications`, `/portal/notifications` |
| FR-12 | Reports | `/dashboard/reports` (+ CSV export) |

## Business rules

- Quotations require a system design on the project
- Approving a quotation can move the project to `APPROVED`
- Project status follows a validated state machine
- Inventory issues are transactional and block on insufficient stock
- Payments cannot exceed quotation total − paid
- Audit log records critical create/update/status actions

## Backup (NFR-09)

```bash
chmod +x scripts/backup.sh
npm run db:backup
```

Cron example (daily 02:00):

```
0 2 * * * cd /path/to/SIMS && ./scripts/backup.sh
```

## Smoke test

```bash
npm run dev   # in one terminal
npm run smoke # in another
```

## Docker (full stack)

```bash
docker compose up --build
```

App maps to port 3000; Postgres to 5433 on the host.
Academic Project
