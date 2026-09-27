# Farmer Connect — Quickstart Guide 🚀

Get the Farmer Connect development environment up and running in under 5 minutes.

## Prerequisites
- Node.js (v18 or higher)
- npm

## 1. Setup Environment
Copy the example `.env` files into active `.env` files.

From the root directory (`farmer-connect-main/`):
```bash
# Setup root frontend .env
cp .env.example .env

# Setup backend .env
cd server
cp .env.example .env
cd ..
```

## 2. Install & Database Bootstrapping
Install packages, build the database, and inject the demo accounts.

```bash
# Install frontend
npm install

# Install backend & generate ORM client
cd server
npm install
npx prisma generate

# Create SQLite Database
npx prisma db push

# Inject Demo Accounts
npm run seed
cd ..
```

## 3. Start the Servers
You need two terminals running simultaneously.

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 (Frontend UI):**
```bash
# From the root directory
npm run dev
# Frontend runs on http://localhost:5173
```

## 4. Explore the Demo
Open [http://localhost:5173](http://localhost:5173) in your browser.
Log in using one of the seeded demo accounts:

| Persona | Email | Password |
| :--- | :--- | :--- |
| **Farmer** | `farmer@demo.com` | `password123` |
| **Buyer** | `buyer@demo.com` | `password123` |
| **Admin** | `admin@demo.com` | `password123` |

## Common Troubleshooting
- **Database Error on Login?** You forgot to run `npm run seed` in the `/server` folder.
- **CORS Error?** Ensure you are accessing the frontend via `http://localhost:5173`. The backend `.env` restricts access via the `CORS_ORIGINS` variable.
- **"Database is Locked" Error?** SQLite does not support massive horizontal concurrency. This is a local development restriction. Retry the action.
