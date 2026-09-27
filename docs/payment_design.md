# Payment Architecture Design

## 1. Domain Model

We have introduced a separate `Payment` table representing the ledger state of an intent to transfer funds.

- `id`: UUID.
- `orderId`: The business order this payment correlates to.
- `buyerId`: The user funding the transaction.
- `amount`: **Integer stored in paise** (1/100 of an INR) to avoid floating point math errors.
- `currency`: String (default "INR").
- `status`: String state machine (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `CANCELLED`, `REFUNDED`).
- `provider`: String representing the gateway (e.g., "MOCK_PROVIDER", "STRIPE", "RAZORPAY").
- `providerTxId`: The reference ID returned by the provider.
- `idempotencyKey`: Unique string provided by the client to prevent accidental double charges.
- `failureReason`: String documenting provider-returned failure codes.

## 2. Mock Provider
A development-only `MockPaymentProvider` in `server/src/services/mockPaymentProvider.ts` is designed to simulate network latency, generate UUID transaction IDs, and pretend to evaluate payment outcomes. 

**This provider does NOT collect actual financial credentials.**

## 3. Webhook Readiness & Security 
The architecture expects that the frontend will initialize a payment via `POST /api/payments`. The backend records a `PENDING` payment and returns a client secret or session token to the frontend.
The frontend uses that secret to interact with the provider (e.g. Stripe Elements).

Upon completion, the provider fires an async webhook. The endpoint `POST /api/payments/:id/simulate` currently mocks this behavior.
In production, a webhook controller will replace this and MUST:
- Verify the webhook signature against a locally stored webhook secret.
- Execute changes inside an atomic database transaction.
- Ensure state transitions are linear (a `CAPTURED` payment shouldn't revert to `PENDING`).

## 4. Order vs Payment Independence
Orders and payments are deliberately loosely coupled.
- A `FAILED` payment **does NOT** cancel the order. It merely fails the payment intent. The buyer can generate a new intent.
- A `CAPTURED` payment **does NOT** automatically mark the order as `DELIVERED` or `PROCESSING`. It simply guarantees the funds are locked in escrow.
- An order that is explicitly `CANCELLED` prior to payment will reject new payment attempts.

## 5. Refunds & Escrow Payouts
- **Current State:** Mocked only.
- **Future:** If an order transitions to `CANCELLED` *after* the payment status is `CAPTURED`, the system should initiate a refund API call.
- **Payout:** Funds are held in escrow (our platform's Stripe/Razorpay connected accounts). Only upon order status `DELIVERED` will a secondary automated ledger job transfer the payout amount (minus commission) to the `supplier`.

## 6. Concurrency and SQLite Limitations
Due to the use of SQLite in development, database-level locking is restricted. The mock ledger relies on the `@unique` constraint on the `idempotencyKey` to prevent concurrent duplicate payment creation. For race conditions during webhook simulation, the backend validates existing statuses before executing state transitions.
In a production deployment, this must be migrated to PostgreSQL using transaction blocks and `SELECT FOR UPDATE` to securely lock the order row during payment evaluation.

## 7. Escrow Simulated Ledger (Stage 7)
We rely on a local append-only `EscrowLedger` table that explicitly represents payment locks and releases. **This is an accounting simulation only and does not hold real funds.**
- A composite `@@unique([paymentId, entryType])` explicitly blocks duplicate locks or releases for the same payment.
- Idempotency Keys map to standard REST standards via unique constraints.
- Authorization forces lock origin to match the Buyer exactly.
- Concurrent identical locks return safely (idempotent); concurrent disparate locks collide at the database level and return error code 409 safely. SQLite handles this organically through indexes rather than `SELECT FOR UPDATE` bounds.
