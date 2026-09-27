# Orders and Logistics Design

## 1. Overview
The Orders and Logistics APIs manage the purchasing process and track the fulfillment timeline. They safely deduct inventory, enforce strict state machine transitions, and maintain a trace of all state changes for auditing.

## 2. Order Creation & Transaction Behavior
- Orders are placed by `BUYER`s against a specific `Produce` batch (`produceId`).
- An optional `requirementId` can be provided if the order fulfills a pre-existing requirement.
- **Atomic Operations:** To prevent overselling, the backend utilizes `prisma.$transaction`. Within the transaction, the produce's availability and remaining quantity are verified. The requested quantity is deducted, and if it reaches zero, the produce `status` is updated to `SOLD`.
- **Pricing:** The agreed price is currently derived from the supplier's `expectedPrice` on the `Produce` record to ensure clients cannot falsify purchase prices. Pricing is assumed to be a per-unit cost (e.g., per Kg or Tonne depending on standard units).

## 3. Order State Machine
The lifecycle of an order strictly follows these allowed transitions:

1. `PENDING` -> `CONFIRMED` or `CANCELLED`
2. `CONFIRMED` -> `PROCESSING`, `PICKUP`, or `CANCELLED`
3. `PROCESSING` -> `PICKUP` or `CANCELLED`
4. `PICKUP` -> `IN_TRANSIT` or `CANCELLED`
5. `IN_TRANSIT` -> `DELIVERED` or `CANCELLED`
6. `DELIVERED` and `CANCELLED` are terminal states.

- If an order is `CANCELLED`, the system automatically restores the deducted quantity back to the `Produce` record's available inventory.

## 4. Logistics and Traceability
- Every status transition via `PATCH /api/orders/:id/status` automatically generates an `OrderEvent` representing that change on the traceability timeline.
- Users can view the chronological event history via `GET /api/orders/:id/events`.
- Manual creation of events is currently disabled to prevent users from forging dispatch or delivery records outside the state machine.

## 5. Matching Engine (`/api/matches`)
- Provides deterministic matching of a Buyer's open `Requirements` against currently `AVAILABLE` `Produce`.
- Matches are based on exact crop matching and quality grade.
- The matching endpoint does not automatically create orders; it strictly serves as a discovery tool for the buyer UI.

## 6. Access Control and Ownership
- **Visibility:** Buyers only see orders where they are the `buyerId`. Suppliers only see orders where they are the `supplierId`.
- **Modification:** Users can only change the status of an order they are involved in.
- **Admin:** `ADMIN` roles can view all orders and override statuses without state machine constraints if required.

## 7. SQLite Limitations
- SQLite's default transaction isolation level provides serialization, which effectively locks the database for write concurrency. This prevents the classic "overselling" race condition. However, for a high-throughput production environment, PostgreSQL with explicit row-level locking (`SELECT ... FOR UPDATE`) is recommended to ensure robust inventory decrementing without locking the entire database.
