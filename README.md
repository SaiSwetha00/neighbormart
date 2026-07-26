# NeighborMart

A full-stack grocery store management platform — built across 5 phases, 26 modules, and 13 dashboards covering every role from store owner to delivery driver.

## Build Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Core admin — products, inventory, suppliers, team, scheduling, audit |
| **Phase 2** | ✅ Complete | POS, sales analytics, finance, CRM, promotions, customer app |
| **Phase 3** | ✅ Complete | AI agent, visual search, advanced analytics & reports |
| **Phase 4** | ✅ Complete | Delivery system, driver app, route optimization, real-time tracking |
| **Phase 5** | ✅ Complete | Marketing, multi-language i18n, accessibility, dark mode, super admin, security |

---

## Project Summary

| Metric | Value |
|--------|-------|
| **Total modules** | 26 |
| **Total dashboards** | 13 |
| **User roles** | 5 (Owner, Manager, Staff, Customer, Driver) |
| **Languages** | 5 (English, Spanish, French, Arabic, Hindi) |
| **Backend endpoints** | 100+ REST routes |
| **Real-time events** | 8 Socket.io event types |
| **AI capabilities** | Mock engine + drop-in Claude API support |

### The 13 Dashboards

| # | Dashboard | Role |
|---|-----------|------|
| 1 | Owner Dashboard | Owner |
| 2 | Products & Categories | Owner |
| 3 | Inventory (6 tabs) | Owner |
| 4 | Suppliers & Purchase Orders | Owner |
| 5 | Team & Scheduling | Owner |
| 6 | Sales Analytics | Owner |
| 7 | Finance & P&L | Owner |
| 8 | CRM & Loyalty | Owner |
| 9 | Delivery Management | Owner |
| 10 | Marketing & Campaigns | Owner |
| 11 | AI Insights Dashboard | Owner |
| 12 | Manager Operations | Manager |
| 13 | Super Admin Dashboard | Super Admin |

---

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI
- React Query (server state) + Zustand (client state)
- Recharts (data visualization)
- i18next + react-i18next (5 languages, RTL support)
- Socket.io-client (real-time updates)

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM + MySQL
- Socket.io (WebSockets)
- node-cron (scheduled jobs)
- Helmet.js + express-rate-limit (security)
- Winston + Morgan (structured logging)
- JWT (HttpOnly cookies, refresh token rotation)

**AI**
- Smart mock AI engine using real DB data — no API credits needed
- Drop-in replacement: set `ANTHROPIC_API_KEY` in `.env` to switch to `claude-sonnet-4-6`
- 14-intent detection, proactive hourly insights, visual search (Phase 3)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MySQL 8+

### 1. Clone and install

```bash
git clone https://github.com/SaiSwetha00/neighbormart.git
cd neighbormart/neighbormart

# Backend
cd backend && npm install

# Owner/Manager/Staff app
cd ../apps/web && npm install

# Customer app
cd ../customer-app && npm install

# Driver app
cd ../driver-app && npm install
```

### 2. Configure environment

Create `neighbormart/backend/.env`:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/neighbormart"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional — leave blank to use the built-in mock AI
ANTHROPIC_API_KEY=
```

### 3. Set up the database

```bash
cd neighbormart/backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Start all servers

```bash
# Backend API (port 5000)
cd neighbormart/backend && npm run dev

# Owner/Manager/Staff app (port 5173)
cd neighbormart/apps/web && npm run dev

# Customer app (port 3000)
cd neighbormart/apps/customer-app && npm run dev

# Driver app (port 3001)
cd neighbormart/apps/driver-app && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the main app.

### Demo Credentials

**Local development** (password: `password123`):

| Role | Email | App |
|------|-------|-----|
| **Owner** | owner@neighbormart.com | localhost:5173 |
| **Manager** | manager@neighbormart.com | localhost:5173 |
| **Staff** | staff.cashier@neighbormart.com | localhost:5173 |
| **Driver** | driver@neighbormart.com | localhost:3001 |
| **Customer** | Register via customer app | localhost:3000 |

**Production demo** (password: `Demo@2026`):

| Role | Email |
|------|-------|
| **Owner** | owner@neighbormart.com |
| **Manager** | manager@neighbormart.com |
| **Staff** | staff.cashier@neighbormart.com |
| **Driver** | driver@neighbormart.com |
| **Customer** | customer@neighbormart.com |
| **Super Admin** | admin@neighbormart.com |

---

## Features by Phase

### Phase 1 — Core Management
- Role-based access control: Owner → Manager → Staff
- Product catalog with categories, pricing, and barcode support
- Inventory: low stock alerts, expiry tracking, waste logs, adjustments, cycle counts
- Supplier management with purchase orders and goods-received notes (GRN)
- Staff scheduling, shift management, attendance tracking, leave requests
- Full audit log for every store action

### Phase 2 — POS, Sales & Customer
- **POS system** — cash drawer, barcode scan, split payments, returns
- **Sales analytics** — revenue charts, top products, hourly trends
- **Finance** — P&L statement, expense tracking, tax reports
- **CRM** — customer profiles, loyalty points, tier system (Bronze/Silver/Gold/Platinum), gift cards
- **Promotions** — percentage and fixed-amount discounts, coupon codes, usage tracking
- **Customer app** — browse products, cart, checkout, order tracking, loyalty dashboard

### Phase 3 — AI Agent & Analytics
- **AI chat agent** — floating button on every page, role-aware (Owner/Manager/Staff/Customer)
- **Mock AI engine** — 14-intent detection, queries live DB for real numbers every response
- **Proactive insights** — hourly cron: low stock, revenue anomaly, expiry alerts; 6 AM daily brief
- **Visual search** — camera icon in customer app, image → product matches
- **Advanced reports** — Sales, Inventory, Low Stock, Waste, Customer reports with AI summaries
- **AI dashboard** — `/owner/ai` — insight feed, priority breakdown, conversation stats

### Phase 4 — Delivery & Logistics
- **Delivery zones** — polygon zones with base fee + per-km pricing, max distance
- **Time slots** — day-of-week slots per zone with order caps
- **Delivery management** — 5-tab owner dashboard: live map, orders queue, zones & slots, drivers, performance
- **Driver assignment** — manager assigns drivers; Socket.io pushes events instantly
- **Driver app** — mobile-first (port 3001): online/offline, queue, accept/reject, GPS updates, mark delivered with proof photo
- **Customer live tracking** — order tracking returns driver GPS coordinates in real time
- **Route optimization** — nearest-neighbour TSP heuristic with Haversine distance; no external API
- **Batch assign** — assign multiple deliveries to one driver with auto-optimized route
- **Driver ratings** — customers rate after delivery; driver average auto-updates

### Phase 5 — Marketing, i18n, Accessibility, Super Admin & Security
- **Marketing & Campaigns** — EMAIL, SMS, PUSH, FLASH_SALE campaign types; A/B testing with traffic split; referral stats; campaign analytics (opens, clicks, conversions)
- **Multi-language i18n** — English, Spanish, French, Arabic (RTL), Hindi; browser auto-detect; persists to localStorage
- **Accessibility WCAG 2.1** — skip-to-content link, `role="main"`, font size control (S/M/L/XL), high-contrast mode, reduce-motion mode, `:focus-visible` ring
- **Complete dark mode** — all 13 dashboards and every page fully theme-aware; toggle in sidebar
- **Super Admin dashboard** — all stores overview, all users with GDPR erase, platform revenue, AI usage tracker, feature flags
- **Security hardening** — Helmet.js CSP headers, rate limiting (100 req/15min), Winston structured logs, `GET /api/health`, GDPR export + soft-delete endpoints

---

## API Overview

All endpoints prefixed with `/api`. Backend on port 5000; Vite dev proxy forwards `/api` requests there.

**Route groups:**
`/auth` · `/dashboard` · `/products` · `/categories` · `/inventory` · `/suppliers` · `/staff` · `/managers` · `/store` · `/audit-logs` · `/profile` · `/orders` · `/sales` · `/finance` · `/crm` · `/promotions` · `/pos` · `/notifications` · `/ai` · `/search` · `/reports` · `/analytics` · `/delivery` · `/driver` · `/routes` · `/customer` · `/campaigns` · `/ab-tests` · `/referrals` · `/admin`

**Health check (no auth):**
```
GET /api/health  →  { status: "ok", timestamp, uptime, environment }
```

---

## Project Structure

```
neighbormart/
├── apps/
│   ├── web/               # Owner/Manager/Staff React app (port 5173)
│   │   └── src/
│   │       ├── pages/     # owner/, manager/, staff/, auth/, admin/
│   │       ├── components/
│   │       │   ├── ai/    # AIChatDrawer, AIInsightCard, AIAlertsPanel
│   │       │   ├── layout/# Sidebar, AppLayout
│   │       │   ├── LanguageSwitcher.tsx
│   │       │   └── AccessibilityControls.tsx
│   │       ├── i18n/      # en, es, fr, ar, hi translations
│   │       └── stores/    # Zustand state
│   ├── customer-app/      # Customer React app (port 3000)
│   └── driver-app/        # Driver mobile-first React app (port 3001)
└── backend/               # Express API (port 5000)
    ├── src/
    │   ├── modules/       # 20+ feature modules
    │   └── jobs/          # proactive.ts — hourly cron + 6AM daily brief
    └── prisma/            # schema + migrations + seed
```

---

## Deployment

**Architecture:** Backend → Railway | Frontends → Vercel (3 projects)

### Part 1 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select `SaiSwetha00/neighbormart`, set **Root Directory** to `neighbormart/backend`
3. Railway auto-detects Node.js from `package.json`
4. Add a **PostgreSQL** plugin: click **+ New → Database → PostgreSQL**
5. Add a **Redis** plugin: click **+ New → Database → Redis**
6. In **Variables**, add every key from `neighbormart/backend/.env.production`:
   - `DATABASE_URL` — copy from the PostgreSQL plugin's "Connect" tab
   - `REDIS_URL` — copy from the Redis plugin's "Connect" tab
   - `JWT_ACCESS_SECRET` — run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and paste
   - `JWT_REFRESH_SECRET` — run same command again, paste a different value
   - `NODE_ENV=production`
   - `FRONTEND_URL` — leave blank for now, fill in after Vercel deploys (Step 3)
7. Click **Deploy** — Railway builds, runs `prisma migrate deploy`, and starts the server
8. Open the **Settings → Networking** tab, copy the public domain (e.g. `https://neighbormart-backend.up.railway.app`)
9. Run production seed: in Railway's terminal (or locally with the Railway DATABASE_URL):
   ```bash
   cd neighbormart/backend && npx ts-node prisma/seed.production.ts
   ```

### Part 2 — Replace Railway URL in vercel.json

In the three `vercel.json` files, replace `[REPLACE_WITH_RAILWAY_URL]` with your actual Railway URL:

```
neighbormart/apps/web/vercel.json
neighbormart/apps/customer-app/vercel.json
neighbormart/apps/driver-app/vercel.json
```

Example: change `https://[REPLACE_WITH_RAILWAY_URL]/api/:path*` →
`https://neighbormart-backend.up.railway.app/api/:path*`

Commit and push this change.

### Part 3 — Deploy Frontends to Vercel (3 separate projects)

Repeat these steps **three times** — once for each app:

| App | Root Directory |
|-----|----------------|
| Owner/Manager/Staff | `neighbormart/apps/web` |
| Customer | `neighbormart/apps/customer-app` |
| Driver | `neighbormart/apps/driver-app` |

Steps per app:
1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Select `SaiSwetha00/neighbormart`
3. Set **Root Directory** to the path from the table above
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy** — Vercel runs `npm run build` and deploys
6. Copy the deployment URL (e.g. `https://neighbormart-web.vercel.app`)

### Part 4 — Wire up CORS and finish

1. Go back to Railway → your backend service → **Variables**
2. Set `FRONTEND_URL` to all three Vercel URLs, **comma-separated** (no spaces):
   ```
   https://neighbormart-web.vercel.app,https://neighbormart-customer.vercel.app,https://neighbormart-driver.vercel.app
   ```
3. Railway auto-redeploys with the new env var
4. Test: open each Vercel URL and log in with the production demo credentials

### Environment Variables Reference

| Variable | Where set | Required |
|----------|-----------|----------|
| `DATABASE_URL` | Railway | Yes |
| `REDIS_URL` | Railway | Yes |
| `JWT_ACCESS_SECRET` | Railway | Yes |
| `JWT_REFRESH_SECRET` | Railway | Yes |
| `NODE_ENV` | Railway | Yes |
| `FRONTEND_URL` | Railway | Yes |
| `ANTHROPIC_API_KEY` | Railway | No (mock AI works without it) |
| `AWS_ACCESS_KEY_ID` | Railway | No (for photo uploads) |

---

## Live Demo

| App | URL |
|-----|-----|
| **Owner/Manager/Staff** | https://web-omega-nine-73.vercel.app |
| **Customer App** | https://customer-app-two-kappa.vercel.app |
| **Driver App** | https://driver-app-flame-xi.vercel.app |
| **Backend API** | https://neighbormart-api-production.up.railway.app |
