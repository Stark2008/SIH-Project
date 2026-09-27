# Farmer Connect

Farmer Connect is a robust agricultural supply chain platform connecting local farmers and aggregators (FPOs) directly with commercial buyers. By removing intermediaries, it enhances market transparency, ensures fair pricing, and improves supply chain efficiency.

**Disclaimer**: This project is currently in a *Simulation / Prototype* phase. It relies on a local SQLite database and uses mocked simulated payment gateways and escrow models. It is **not** approved for handling real fiat funds.

---

## 🚀 Features

- **Role-Based Access**: Specialized dashboards for Farmers, FPOs, Buyers, and Admins.
- **Produce Management**: Farmers and FPOs can list, edit, and manage harvest inventory.
- **Demand Requirements**: Buyers can post specific crop procurement requirements.
- **Prototype Demand Matching**: Deterministic algorithms match listed produce with buyer requirements.
- **Logistics & Traceability**: A robust state-machine tracking orders from `PENDING` to `DELIVERED`.
- **Simulated Financial Ledgers**: Idempotent mock payment gateways and escrow ledgers tracking fund lock/release flows entirely within the backend logic.
- **AI Mockups**: UI integrations demonstrating where Price Intelligence, Demand Forecasting, and Computer Vision Quality Checks will slot into a future architecture.

---

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Recharts (for charts), Lucide React (for icons)
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (Local Dev) / Prisma ORM
- **Security**: JWT Authentication, bcrypt password hashing, CORS configurations

---

## 📂 Project Structure

```bash
farmer-connect-main/
├── README.md
├── QUICKSTART.md              # 10-minute setup guide
├── PROJECT_HANDOVER.md        # Architectural handover notes
├── package.json               # Root frontend package
├── src/                       # React frontend source code
│   ├── App.tsx                # Main UI, Routing, and Components
│   └── lib/api.ts             # Centralized API fetch wrapper
├── docs/                      # Extensive design & architecture reports
└── server/                    # Node.js Express backend
    ├── package.json           # Backend package scripts
    ├── prisma/
    │   ├── schema.prisma      # DB schema models
    │   └── seed.ts            # Bootstraps demo data
    └── src/
        ├── index.ts           # Express entry point
        ├── middleware/        # JWT & Auth guards
        ├── routes/            # REST API controllers
        └── services/          # Core ledger & simulation business logic
```

---

## ⚙️ Installation and Setup

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Environment Variables
Create a `.env` file in the root folder:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Create a `.env` file in the `server/` folder (reference `server/.env.example`):
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=super_secret_jwt_key_for_demo_only
DATABASE_URL="file:./dev.db"
ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Installation & Database Setup
```bash
# Install root (frontend) dependencies
npm install

# Install server dependencies and generate Prisma client
cd server
npm install
npx prisma generate

# Create the SQLite database and run migrations
npx prisma db push

# Seed the database with demo accounts and fake produce
npm run seed
```

### 4. Running the Application
Open two separate terminal windows:

**Terminal 1: Backend**
```bash
cd server
npm run dev
```

**Terminal 2: Frontend**
```bash
# From the root directory
npm run dev
```
Navigate to `http://localhost:5173`.

### 5. Running Tests & Builds
To run the automated integration tests:
```bash
cd server
npm run test
```

To build for production:
```bash
# Build frontend
npm run build

# Build backend
cd server
npm run build
```

---

## 🔑 Demo Accounts

The following accounts are generated during the `npm run seed` command. 
**Password for all demo accounts**: `password123`

- **Farmer**: `farmer@demo.com`
- **FPO**: `fpo@demo.com`
- **Buyer**: `buyer@demo.com`
- **Admin**: `admin@demo.com`

---

## 🔌 API Overview

All routes are prefixed with `/api`.
- `/auth`: Registration, Login, Token validation (`/me`)
- `/produce`: Inventory listing, editing, filtering, and deletion
- `/requirements`: Buyer demand posting and tracking
- `/matches`: Deterministic matching connecting requirements to produce
- `/orders`: Order creation, tracking, status updates, and timeline events
- `/payments`: Simulated mock payment intent generation
- `/escrow`: Internal ledger tracking for locking and releasing simulated funds

---

## ⚠️ Known Limitations
- **SQLite Database**: The database is local file-based. It does not scale horizontally. Moving to production requires pointing `DATABASE_URL` to a PostgreSQL instance.
- **Simulated Financials**: Payments and Escrow do not connect to a banking layer.
- **Mocked AI**: Graphs and computer vision results are currently hardcoded or randomized for UI presentation purposes only.

For detailed architecture handovers, please read `PROJECT_HANDOVER.md` and review the `docs/` folder.
