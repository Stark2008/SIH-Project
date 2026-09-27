# Database Design: Farmer Connect

This document outlines the Prisma schema design for the application, addressing the core workflows identified in the audit.

## 1. Entities & Relationships

### `User`
Represents the actors in the system (Farmers, FPOs, Buyers, Admins).
- **Primary Key:** `id` (UUID)
- **Fields:** `email` (Unique), `passwordHash`, `name`, `location`, `createdAt`, `updatedAt`.
- **Enums:** `Role` (FARMER, FPO, BUYER, ADMIN).
- **Relationships:**
  - One-to-Many with `Produce` (as the supplier).
  - One-to-Many with `Requirement` (as the buyer).
  - One-to-Many with `Order` (as the buyer).
  - One-to-Many with `Order` (as the supplier).

### `Produce`
Represents the inventory added by Farmers or FPOs.
- **Primary Key:** `id` (UUID)
- **Fields:** `crop` (String), `quantity` (Float), `harvestDate` (DateTime), `location` (String), `qualityGrade` (String), `expectedPrice` (Float), `createdAt`, `updatedAt`.
- **Enums:** `ProduceStatus` (AVAILABLE, COMMITTED, SOLD).
- **Relationships:**
  - Belongs to `User` (supplierId).
  - One-to-Many with `Order` (a single produce batch might be partially fulfilled by multiple orders).

### `Requirement`
Represents the demand posted by Buyers.
- **Primary Key:** `id` (UUID)
- **Fields:** `crop` (String), `quantity` (Float), `qualityGrade` (String), `deliveryLocation` (String), `createdAt`, `updatedAt`.
- **Enums:** `RequirementStatus` (OPEN, FULFILLED, CANCELLED).
- **Relationships:**
  - Belongs to `User` (buyerId).
  - One-to-Many with `Order` (a requirement can be fulfilled by multiple orders).

### `Order`
Represents the transaction/match between a Buyer's Requirement and a Supplier's Produce.
- **Primary Key:** `id` (UUID)
- **Fields:** `agreedQuantity` (Float), `agreedPrice` (Float), `createdAt`, `updatedAt`.
- **Enums:** `OrderStatus` (PENDING, CONFIRMED, PICKUP, IN_TRANSIT, DELIVERED).
- **Relationships:**
  - Belongs to `User` (buyerId).
  - Belongs to `User` (supplierId).
  - Belongs to `Produce` (produceId).
  - Belongs to `Requirement` (requirementId) - optional, as an order might be placed without a prior requirement posting.
  - One-to-Many with `OrderEvent` (Traceability timeline).

### `OrderEvent`
Represents the timeline of events for traceability (e.g., "Harvested", "Quality checked", "In Transit").
- **Primary Key:** `id` (UUID)
- **Fields:** `status` (OrderStatus), `description` (String), `location` (String), `createdAt`.
- **Relationships:**
  - Belongs to `Order` (orderId).

## 2. Constraints & Data Integrity
- **Foreign Keys:** Prevent deletion of a `User` if they have associated `Orders`.
- **Validation:** Quantities and prices must be positive (enforced at the application level, though Prisma Types help structure it).
- **Consistency:** An `Order` creation must deduct the `agreedQuantity` from the `Produce` available quantity. This requires database transactions (supported by Prisma).

## 3. Local Development (SQLite)
- **Current Database Provider:** SQLite for local development (as a fallback due to lack of local PostgreSQL environment).
- **Database URL Format:** `DATABASE_URL="file:./dev.db"`
- **Migration Command:** `npx prisma migrate dev --name init`
- **Seed Command:** `npx prisma db seed`

## 4. SQLite Schema Limitations & PostgreSQL Considerations
- **No Enum Support:** SQLite does not support native database enums. `Role`, `ProduceStatus`, `RequirementStatus`, and `OrderStatus` were converted to `String` fields with defaults. Application-level validation is required to ensure only valid string values are saved.
- **Production Recommendation:** PostgreSQL should be used for production or any multi-user deployment to regain native enum support, better concurrency, and advanced features (like geospatial querying for route optimization). When switching back to PostgreSQL for production, the schema will need to be reverted to use Prisma `enum` types.
