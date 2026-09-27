# Farmer Connect — Hackathon Demonstration Guide

This guide details how to confidently present the Farmer Connect application at a hackathon, ensuring all simulated features are presented transparently and all workflows function reliably.

**DISCLAIMER**: The application remains a local simulation. It is not approved for handling real funds. Real financial processing, production scale AI, and physical supply chain tracking are strictly simulated in this build.

---

## 1. Environment & Setup

Ensure your local development environment has Node.js (v18+) and SQLite installed.

### Environment Variables (`server/.env`)
Create or verify `.env` in the `/server` directory:
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=super_secret_jwt_key_for_demo_only
DATABASE_URL="file:./dev.db"
ALLOWED_ORIGIN=http://localhost:5173
```

### Initializing the Demo
From the root directory, run these commands in order:

```bash
# 1. Install dependencies
npm install
cd server && npm install

# 2. Reset and seed the database
npx prisma db push --force-reset
npm run seed

# 3. Start the application stack
# Open Terminal 1: Backend
npm run dev

# Open Terminal 2: Frontend
cd ..
npm run dev
```
The frontend will be available at `http://localhost:5173`.

---

## 2. Demo Accounts

The seed script (`npm run seed`) injects four primary personas into the database to demonstrate role-based access.

| Role | Email | Password | UI Capabilities |
| :--- | :--- | :--- | :--- |
| **Farmer** | `farmer@demo.com` | `password123` | Can list inventory, view demand, accept orders |
| **FPO** | `fpo@demo.com` | `password123` | Similar to farmer, represents aggregated inventory |
| **Buyer** | `buyer@demo.com` | `password123` | Can post requirements, order produce, pay into escrow |
| **Admin** | `admin@demo.com` | `password123` | Can view escrow ledger, manually release escrow |

*Note: You can use the quick-fill buttons on the login page to skip typing credentials.*

---

## 3. Recommended Demonstration Workflow

To tell a complete end-to-end story during your presentation, follow this sequence:

### Step A: The Farmer (Supply Creation)
1. Log in as **Farmer** (`farmer@demo.com`).
2. Navigate to **My Produce**.
3. Fill out the "Add Produce Listing" form (e.g., 500kg of Onions).
4. Point out the **AI Forecast** (Simulation) tab to show how farmers could hypothetically decide *when* to sell.

### Step B: The Buyer (Demand & Order)
1. Open a new Incognito window (or log out) and log in as **Buyer** (`buyer@demo.com`).
2. Navigate to **Post Requirement** to indicate demand (e.g., 200kg of Onions).
3. Navigate to **Find Produce**. The onions listed by the Farmer will appear.
4. Click **Order Produce**. Order 200kg.
5. The UI will redirect to **Orders & Tracking**.

### Step C: Simulated Payment & Escrow Lock
1. As the Buyer, on the newly created order, click **Initialize Payment Intent**.
2. Click **Simulate Bank Success**.
3. Click **Lock Funds in Escrow**. Explain how the ledger acts as an immutable, double-entry hold on funds until physical delivery is verified.

### Step D: Fulfillment & Delivery
1. Log back in as **Farmer**.
2. Go to **Orders & Tracking**.
3. Advance the order status to `IN_TRANSIT`.
4. Log back in as **Buyer** and click **Confirm Receipt (Delivered)**. (Alternatively, the Farmer can also advance to DELIVERED depending on logistics integrations).

### Step E: The Admin (Escrow Release)
1. Log in as **Admin** (`admin@demo.com`).
2. Go to the **Escrow Ledger** tab. Show the immutable ledger history.
3. Go to **All Orders**. Find the delivered order and click **Release Escrow to Supplier**.
4. The ledger updates to `ESCROW_RELEASED`, finalizing the simulated transaction.

---

## 4. UI Polish & Integrity Details
- **Idempotency**: Clicking "Initialize Payment" multiple times rapidly will not create duplicate money. The system uses strict idempotency keys (you can demonstrate this by showing the single payment record).
- **Inventory Restoration**: If an order is cancelled before delivery, the system mathematically restores the exact inventory to the farmer.
- **Prototype Labels**: Notice the `✦ Simulation` labels on the AI Chat, CV Quality Check, and Demand Forecasting charts. Highlight to judges that you have architected the *pipes* for AI, even if the backend models are currently mocked.

## 5. Troubleshooting
- **Missing Data?** If the app feels out of sync, ensure both backend and frontend servers are running, and verify that you didn't accidentally delete the `.env` file.
- **Database Locked?** If SQLite throws a "database is locked" error during rapid concurrent clicks, simply wait 1 second and retry (SQLite concurrency limitation).
- **Blank Screen?** Check the browser console. If CORS errors appear, ensure `ALLOWED_ORIGIN` in the backend `.env` exactly matches the frontend URL (`http://localhost:5173`).
