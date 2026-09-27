# Project Handover Document

## 1. Project Purpose
**Farmer Connect** aims to dismantle agricultural supply-chain opacity by allowing Farmers and FPOs (aggregators) to match directly with commercial Buyers. It intends to provide an ecosystem for demand discovery, trackable logistics, and escrow-based fair payments. 

Currently, the project is a **functional prototype / simulation** built for demonstration and hackathon validation.

## 2. Implementation Status
The application is structurally robust but functionally simulated in key integration areas.

### Completed Functionality
- **Monolith Architecture**: React/Vite frontend natively interacting with an Express/Prisma backend.
- **Role-Based Security**: Complete end-to-end token validation preventing role forgery (Farmers cannot access Buyer endpoints).
- **Core State Machines**: The `orders.ts` routes properly handle physical flow transitions (`PENDING` -> `DELIVERED`).
- **Data Integrity / Concurrency**: The inventory model reliably deducts supply on order and correctly restocks upon cancellation (utilizing `prisma.$transaction`).
- **Escrow Accounting**: A fully double-entry internal ledger exists inside `escrowService.ts`, relying on idempotent keys to prevent double-charging or double-releasing funds.
- **Automated Testing**: 49 backend Vitest tests guarantee stability of all auth, payment, and order workflows.

### Incomplete / Prototype Functionality
- **Financial APIs**: There is no Stripe or Razorpay integration. `payments.ts` creates mock HTTP records.
- **AI Services**: UI placeholders exist for "Computer Vision Quality" and "Price Forecasts", but the backend does not process images or run ML models yet.
- **PostgreSQL**: The application defaults to SQLite to guarantee easy local startup.

## 3. Important Architectural Decisions
- **Idempotency Keys**: To prevent users from accidentally refreshing the page and locking funds twice, all escrow and payment `POST` endpoints require a unique string `idempotencyKey` in the request body.
- **Centralized API Wrapper**: The frontend uses `src/lib/api.ts` to attach JWT tokens to every request globally, and handle 4xx/5xx exceptions gracefully.
- **Escrow Gating**: Simulated funds can only be released by an `ADMIN` role, and the system structurally enforces that the attached Order must be `DELIVERED`.

## 4. Where to Look First
- **Backend Entrypoint**: `server/src/index.ts` (CORS and middleware setup)
- **Database Schema**: `server/prisma/schema.prisma` (Understand the data models)
- **Business Logic**: `server/src/routes/orders.ts` and `server/src/services/escrowService.ts`
- **Frontend Master View**: `src/App.tsx` (Contains all UI views via state-based routing)

## 5. Recommended Next Steps (For the Next Developer)
1. **PostgreSQL Migration**: Migrate the SQLite schema to PostgreSQL on a cloud provider (e.g. Supabase, Render) to allow horizontal backend scaling.
2. **React Router**: Refactor `src/App.tsx` into a multi-file folder structure using `react-router-dom` to cleanly separate dashboard pages.
3. **Payment Webhooks**: Replace the `paymentService.ts` simulation with real Stripe/Razorpay webhooks.

## 6. Crucial Warning
**Features that MUST NOT be represented as real:**
Under no circumstances should the escrow ledger or payment gateway be represented as processing real fiat funds. The platform currently operates a closed-loop mock database simulation. Always disclose this to stakeholders.
