# NeighborMart

A full-stack grocery store management platform for owners, managers, and staff.

## Tech Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Radix UI, React Query, Zustand, React Hook Form, Zod, Recharts

**Backend** — Node.js, Express, TypeScript, Prisma ORM, SQLite (dev), Socket.io, Redis

## Features

| Role | Pages |
|------|-------|
| **Owner** | Dashboard, Products, Categories, Inventory (6 tabs), Suppliers, Team, Schedule, Audit Log, Settings |
| **Manager** | Dashboard with low-stock and expiring alerts |
| **Staff** | Personal dashboard with shift and attendance info |

- Real-time stock alerts via Socket.io
- Role-based access (Owner → Manager → Staff)
- Inventory tracking: low stock, expiry, waste logs, adjustments, audits
- Supplier & purchase order management
- Staff scheduling, attendance, and leave requests
- Audit log for all store actions
- Store settings (name, currency, timezone, tax, thresholds)

## Project Structure

```
neighbormart/
├── apps/web/          # React frontend (Vite)
│   └── src/
│       ├── pages/     # owner/, manager/, staff/, auth/
│       ├── components/
│       ├── services/  # axios API calls
│       └── stores/    # Zustand state
└── backend/           # Express API
    ├── src/
    │   └── modules/   # auth, users, products, inventory, suppliers, staff, dashboard, audit
    └── prisma/        # schema + migrations + seed
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
cd neighbormart/backend && npm install
cd ../apps/web && npm install
```

### 2. Set up the database

```bash
cd neighbormart/backend
npx prisma migrate dev
npx prisma db seed
```

### 3. Configure environment

Create `neighbormart/backend/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=5000
NODE_ENV=development
```

### 4. Start the servers

```bash
# Backend (port 5000)
cd neighbormart/backend && npm run dev

# Frontend (port 5173)
cd neighbormart/apps/web && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Seed credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@neighbormart.com | password123 |
| Manager | manager@neighbormart.com | password123 |
| Staff | staff.cashier@neighbormart.com | password123 |

## API

All endpoints are prefixed with `/api`. The server runs on port 5000 and the Vite dev proxy forwards `/api` requests there.

Key routes: `/auth`, `/dashboard`, `/products`, `/categories`, `/inventory`, `/suppliers`, `/staff`, `/managers`, `/store`, `/audit-logs`, `/profile`
