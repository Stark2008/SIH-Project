# Known Limitations

This document serves as an architectural disclosure for the hackathon release of Farmer Connect. It outlines the intentional constraints and scaling boundaries of the current prototype.

## 1. Financial Simulation
- **Constraint**: The payment gateway and escrow ledger are 100% simulated. 
- **Resolution Path**: A complete integration with Razorpay Route, Stripe Connect, or a banking API is required to facilitate real fiat money transfers, payout scheduling, and KYC compliance.

## 2. Database Constraints (SQLite vs PostgreSQL)
- **Constraint**: The application runs on SQLite. While safe for a single-server Node.js runtime with serialized operations, SQLite does not scale horizontally.
- **Resolution Path**: The `schema.prisma` is prepared for PostgreSQL. A migration to RDS/PostgreSQL is necessary to allow multi-instance deployment and row-level locking for concurrent inventory management.

## 3. AI Predictive Accuracy
- **Constraint**: The "Demand Forecasting", "Price Intelligence", and "Computer Vision Quality Grading" modules currently present hardcoded or randomized deterministic outputs.
- **Resolution Path**: Requires deploying Python microservices (e.g., FastAPI with PyTorch) or integrating with external AI APIs (OpenAI Vision, AWS Forecast) to process real historical datasets.

## 4. Scalable Logistics
- **Constraint**: Order fulfillment states (`PENDING` → `IN_TRANSIT` → `DELIVERED`) are advanced manually by users clicking buttons.
- **Resolution Path**: Requires integration with real logistics partners (e.g., Delhivery, Dunzo, or local trucking APIs) using webhooks to drive state transitions automatically based on real-world GPS checkpoints.

## 5. Email / Notification Services
- **Constraint**: The platform currently does not send SMS or Email notifications for password resets, order confirmations, or matches.
- **Resolution Path**: Integrate Twilio (SMS for rural farmers) and SendGrid/AWS SES for commercial buyers.
