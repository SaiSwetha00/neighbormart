# NeighborMart — Phase 1 Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## Quick Start

### 1. Clone & Install Dependencies
```bash
cd neighbormart
npm install
cd backend && npm install
cd ../apps/web && npm install
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

### 3. Set Up Database
```bash
# Start PostgreSQL and create database
createdb neighbormart

# Run migrations
cd backend
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed with demo data
npx ts-node prisma/seed.ts
```

### 4. Start Development Servers
```bash
# From root directory — starts both backend and frontend
cd ..
npm run dev

# Or start separately:
# Backend: http://localhost:5000
cd backend && npm run dev

# Frontend: http://localhost:5173
cd apps/web && npm run dev
```

## Demo Credentials (after seeding)

| Role    | Email                      | Password    |
|---------|---------------------------|-------------|
| Owner   | owner@neighbormart.com    | password123 |
| Manager | manager@neighbormart.com  | password123 |
| Staff   | staff1@neighbormart.com   | password123 |

## Project Structure
```
neighbormart/
├── apps/web/          # React frontend (Vite + Tailwind + Shadcn)
├── backend/           # Express API + Prisma + PostgreSQL
│   ├── src/
│   │   ├── modules/  # Feature modules (auth, products, inventory...)
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
└── SETUP.md
```

## API Endpoints
Base URL: `http://localhost:5000/api`

- `POST /auth/register-store` — Register new store + owner
- `POST /auth/login` — Login (returns JWT cookies)
- `GET  /dashboard/owner` — Owner KPI dashboard
- `GET  /products` — Product catalog
- `GET  /inventory` — Inventory overview
- ... (see module route files for full list)

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui, React Query, Zustand, Recharts
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache/Sessions**: Redis
- **Auth**: JWT (access + refresh tokens, httpOnly cookies)
- **Real-time**: Socket.io
