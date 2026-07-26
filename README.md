# NeighborMart

A full-stack grocery store management platform for owners, managers, staff, customers, and delivery drivers.

## Build Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Core admin — products, inventory, suppliers, team, scheduling, audit |
| **Phase 2** | ✅ Complete | POS, sales analytics, finance, CRM, promotions, customer app |
| **Phase 3** | ✅ Complete | AI agent (mock), visual search, advanced analytics & reports |
| **Phase 4** | 🔜 Planned | — |

## Tech Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Radix UI, React Query, Zustand, Recharts

**Backend** — Node.js, Express, TypeScript, Prisma ORM, MySQL, Socket.io, node-cron

**AI** — Smart mock AI engine (real DB data) · Drop-in replacement for Claude API (`claude-sonnet-4-6`)

## Features

### Phase 1 — Core Management
| Role | Pages |
|------|-------|
| **Owner** | Dashboard, Products, Categories, Inventory (6 tabs), Suppliers, Team, Schedule, Audit Log, Settings, Profile |
| **Manager** | Dashboard, Inventory alerts |
| **Staff** | Personal dashboard, shift and attendance info |

- Role-based access: Owner → Manager → Staff
- Inventory: low stock, expiry tracking, waste logs, adjustments, cycle counts
- Supplier & purchase order management with GRN
- Staff scheduling, attendance, leave requests
- Full audit log for all store actions

### Phase 2 — POS, Sales & Customer
- **POS system** — cash drawer, barcode scan, split payments, returns
- **Sales analytics** — revenue charts, top products, hourly trends
- **Finance** — P&L, expense tracking, tax reports
- **CRM** — customer profiles, loyalty points, tiers, gift cards
- **Promotions** — percentage/fixed discounts, coupons, usage tracking
- **Customer app** — browse products, cart, checkout, order tracking, loyalty

### Phase 3 — AI Agent & Analytics ✅
- **AI chat agent** — floating button on every page, role-aware responses for all 5 roles
  - Owner: revenue trends, forecasts, staff status, proactive alerts
  - Manager: operations summary, pending orders, expiry alerts
  - Staff: product lookup, stock checks, return guidance
  - Customer: order tracking, meal planning, product search, deals
- **Mock AI engine** — uses real live DB data (no API credits needed)
  - Intent detection across 14 categories
  - Auto-switches to Claude API when a funded key is set in `.env`
- **Proactive insights** — hourly cron checks (stock, revenue anomaly, expiry), 6 AM daily brief
- **Visual search** — camera icon in customer app, image → product matches via Claude vision
- **Advanced reports** — Sales, Inventory, Low Stock, Waste, Customer reports with AI summaries
- **AI dashboard** — `/owner/ai` — insight feed, priority breakdown, conversation stats
- **Report builder** — custom templates, saved reports, AI-generated summaries

## Project Structure

```
neighbormart/
├── apps/
│   ├── web/               # Owner/Manager/Staff React app (port 5173)
│   │   └── src/
│   │       ├── pages/     # owner/, manager/, staff/, auth/
│   │       ├── components/
│   │       │   ├── ai/    # AIChatDrawer, AIInsightCard, AIAlertsPanel
│   │       │   └── layout/
│   │       └── stores/    # Zustand state
│   └── customer-app/      # Customer React app (port 3000)
└── backend/               # Express API (port 5000)
    ├── src/
    │   ├── modules/       # auth, users, products, inventory, suppliers,
    │   │                  # staff, orders, sales, finance, crm, promotions,
    │   │                  # notifications, pos, ai, search, analytics
    │   └── jobs/          # proactive.ts — hourly cron + 6AM daily brief
    └── prisma/            # schema + migrations + seed
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
DATABASE_URL="mysql://root:password@127.0.0.1:3306/neighbormart"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional — AI features work without this (mock AI uses real DB data)
# Add a funded Anthropic key to switch from mock to real Claude:
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 4. Start the servers

```bash
# Backend (port 5000)
cd neighbormart/backend && npm run dev

# Owner/Manager/Staff app (port 5173)
cd neighbormart/apps/web && npm run dev

# Customer app (port 3000)
cd neighbormart/apps/customer-app && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Seed credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@neighbormart.com | password123 |
| Manager | manager@neighbormart.com | password123 |
| Staff | staff@neighbormart.com | password123 |
| Customer | (register via customer app) | — |

## AI Features

The AI agent works out of the box with no API key required. The mock AI engine:
- Detects message intent (revenue, stock, expiry, orders, staff, customers, forecasts, meal planning…)
- Queries the live database for real numbers in every response
- Covers all 5 roles with role-appropriate depth and tone
- Runs proactive hourly checks and a 6 AM daily brief

To switch to real Claude (`claude-sonnet-4-6`), set a funded `ANTHROPIC_API_KEY` in `.env` and restart the backend — no code changes needed.

## API

All endpoints are prefixed with `/api`. The backend runs on port 5000; the Vite dev proxy forwards `/api` requests there.

Key route groups: `/auth`, `/dashboard`, `/products`, `/categories`, `/inventory`, `/suppliers`, `/staff`, `/managers`, `/store`, `/audit-logs`, `/profile`, `/orders`, `/sales`, `/finance`, `/crm`, `/promotions`, `/pos`, `/notifications`, `/ai`, `/search`, `/reports`, `/analytics`
