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

| Role | Email | Password | App |
|------|-------|----------|-----|
| **Owner** | owner@neighbormart.com | password123 | localhost:5173 |
| **Manager** | manager@neighbormart.com | password123 | localhost:5173 |
| **Staff** | staff@neighbormart.com | password123 | localhost:5173 |
| **Customer** | Register via customer app | — | localhost:3000 |
| **Driver** | driver@neighbormart.com | password123 | localhost:3001 |

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
