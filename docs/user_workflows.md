# User Workflows & Access Matrix

This document outlines the workflows simulated by the frontend and defines the required backend counterparts to make them functional.

## 1. Roles & Permissions (Inferred from UI)
- **Farmer:** Can add produce, view personal harvest data, get AI price recommendations, and upload quality check images.
- **FPO (Farmer Producer Organization):** Can view aggregated AI forecasts, quality checks, and price intelligence. (Presumably aggregates produce from multiple farmers).
- **Buyer:** Can post requirements, view AI matches (suppliers), track deliveries, and view price intelligence.
- **Admin:** Has global oversight, views demand analytics, logistics savings, and overall user counts.

## 2. Core Workflows

### Authentication Workflow
- **Current UI Behavior:** Clicking a role button instantly logs the user in.
- **Required Implementation:** 
  - Registration/Login screens.
  - Backend endpoints (`/api/auth/register`, `/api/auth/login`).
  - Secure session/JWT management.
  - Role-based Access Control (RBAC) middleware protecting all API routes.

### Add Produce Workflow (Farmer)
- **Current UI Behavior:** User fills out Crop, Quantity, Harvest Date, Location, Quality, Price -> Hits Submit -> Local `produce` state is overwritten -> Shows in a single-row table.
- **Required Implementation:**
  - `POST /api/produce` endpoint.
  - Validate inputs (quantity > 0, price > 0, future dates).
  - Save to `Produce` table linked to the `Farmer`'s User ID.
  - `GET /api/produce` to fetch and render a multi-row list of the farmer's inventory.

### Post Requirement & Matching Workflow (Buyer)
- **Current UI Behavior:** Buyer enters Crop, Quantity, Quality, Delivery Location -> Hits Submit -> Transition to "Matches" showing a hardcoded 94% match -> Clicks "Accept Match".
- **Required Implementation:**
  - `POST /api/requirements` to save the buyer's need.
  - `GET /api/matches/:requirementId` to query the database for available `Produce` that fits the criteria, calculated by distance and quantity.
  - `POST /api/orders` triggered by "Accept Match", creating a transaction between the Buyer and the Supplier (Farmer/FPO), deducting inventory, and generating an Order ID.

### Order Tracking & Logistics Workflow
- **Current UI Behavior:** Shows a static route and a button to step through statuses (`Pending` -> `Confirmed` -> `Pickup` -> `In Transit` -> `Delivered`).
- **Required Implementation:**
  - State machine on the backend for the `Order` entity ensuring valid transitions.
  - Role restrictions: Only Suppliers/Logistics should be able to update statuses to 'Pickup' or 'Delivered'. Buyers should only have read access.
  - `PATCH /api/orders/:id/status` endpoint.
  - Traceability timeline generation based on status update timestamps.

### AI Image Quality Check
- **Current UI Behavior:** Select file -> Click Analyze -> Shows static 91/100 result.
- **Required Implementation:**
  - `POST /api/analyze-quality` utilizing `multer` (or similar) to handle multipart/form-data.
  - Integration with a Computer Vision model or an external API to return actual defect percentages.

### AI Chat Assistant
- **Current UI Behavior:** Type anything -> Returns fixed response about Bengaluru tomatoes.
- **Required Implementation:**
  - `POST /api/chat` sending user prompt and user context (role, recent orders) to an LLM provider (e.g., OpenAI, Gemini), returning a contextual stream or response.
