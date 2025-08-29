# InventoryApp

A full-stack inventory manager built with **React + TypeScript + Tailwind** (frontend) and **Express + TypeScript + Prisma + PostgreSQL** (backend).  
Includes a lightweight, Prisma-Studio-style **Dashboard** for browsing, searching, and editing records.

---

## ✨ Features

- Monorepo structure: `apps/frontend` + `apps/backend`
- PostgreSQL database with Prisma
- Studio-like **Dashboard**: list, search, sort, create, update, bulk-delete
- Relational models (examples): `User`, `Inventory`, `Item`, `Tag`, `InventoryMember`, `CustomField`, `ItemValue`, `Comment`, `Like`
- Safe bulk delete with **manual cascade** to avoid FK errors
- Ready for free deployment: **Netlify (frontend)** + **Render (backend + Postgres)**

---

## 🧱 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **ORM / DB:** Prisma, PostgreSQL
- **Auth (optional):** OAuth callback page is present; you can wire Google/GitHub if desired
- **Deployment:** Netlify (static), Render (web service + Postgres)

---

## 📁 Project Structure

InventoryApp/
├─ apps/
│ ├─ frontend/ # React + Vite + Tailwind
│ └─ backend/ # Express + Prisma + TypeScript
├─ README.md
└─ (optional) docs/


---

## ⚙️ Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local or hosted — Render works great)

---

## 🔐 Environment Variables

Create `.env` files (do **not** commit them). Examples:

**apps/backend/.env**

DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=change-me # or any strong string (used for sessions/tokens if enabled)
PORT=8080
CORS_ORIGIN=http://localhost:5173

NODE_ENV=development


**apps/frontend/.env**

VITE_API_URL=http://localhost:8080


> **Optional (OAuth):** If you add Google/GitHub OAuth later, include their client IDs/secrets in `apps/backend/.env` and wire the routes.

---

## 🛠️ Setup & Run (Local)

From the repo root:

```bash
# 1) Install deps per app
cd apps/backend
npm ci

cd ../frontend
npm ci


Database (Prisma)
# in apps/backend
cd ../backend
npx prisma migrate dev        # applies migrations locally
npx prisma generate
# (optional) npx prisma db seed

Start backend
# in apps/backend
npm run dev                   # starts Express on PORT (default 8080)

Start frontend
# in apps/frontend
npm run dev                   # Vite dev server on http://localhost:5173

Frontend config
Ensure apps/frontend/.env points to your API: VITE_API_URL=http://localhost:8080.


📚 API & Dashboard
The backend exposes Studio-style routes (used by the Dashboard UI):
GET /api/studio/models — list models + metadata
GET /api/studio/rows — query rows with pagination, search, sort
POST /api/studio/create — create a record
PATCH /api/studio/update — update a record by id
DELETE /api/studio/delete — bulk delete by ids (transactional, manual cascade)
The delete endpoint casts string ids → numbers when needed and clears child rows first to avoid FK constraint errors.

🧪 Useful Scripts
apps/backend/package.json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}

apps/frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173"
  }
}

🔧 Troubleshooting
CORS errors: verify CORS_ORIGIN on the backend matches your frontend URL (both local and deployed).
FK constraint on delete: backend uses manual cascade in a transaction; if you added new relations, update the cascade map accordingly.
Prisma client errors: re-run npx prisma generate after schema changes.


📜 License
MIT © 2025

👤 Author
Adriana Bazan
GitHub: @bazanadriana