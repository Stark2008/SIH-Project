# Authentication and Authorization Design

## 1. Strategy Overview
Farmer Connect uses **JSON Web Tokens (JWT)** for backend authentication and role-based authorization.
- **Why JWT?** It's stateless, easy to integrate with mobile/web clients, and reduces database lookups for session validation. In this initial architecture, we transmit tokens via the `Authorization: Bearer <token>` header rather than cookies to support potential future cross-platform clients (e.g., mobile apps) more easily, without worrying about CORS/CSRF complexities at this stage.

## 2. Security Considerations & Protections
- **Password Hashing:** Passwords are never stored in plaintext. They are hashed using `bcrypt` (with 10 salt rounds) before insertion into the database.
- **Token Secret:** A strong `JWT_SECRET` must be set in the `.env` file. In development, a placeholder is used.
- **Token Expiration:** JWTs are set to expire in `24h` to limit the window of opportunity for stolen tokens.
- **Safe Error Messages:** Login and registration endpoints use generic error messages (e.g., "Registration failed. Email might already be in use.") to prevent user enumeration attacks.
- **No Password Exposure:** The `passwordHash` field is explicitly excluded from API responses (e.g., the `user` object returned during login or `/me`).
- **Role Validation:** Self-registration is strictly limited to `FARMER`, `FPO`, and `BUYER` roles. Users cannot self-register as `ADMIN`.
- **Environment Variables:** Secrets are loaded via `.env` which is excluded from version control.

## 3. Middleware
- **`authenticate`:** Extracts the JWT from the `Authorization` header, verifies its signature and expiration, and fetches the user from the database. It attaches the user payload to `req.user`.
- **`authorize(roles: string[])`:** Ensures that the authenticated user's role is included in the permitted `roles` array. If not, it returns a `403 Forbidden` response.

## 4. Roles and Permissions
The application supports the following roles:
- **`FARMER`**: Can manage their own produce, view market prices, and manage their orders as a supplier.
- **`FPO`**: Functions similarly to a `FARMER` but can potentially manage produce for multiple aggregated entities (future scope). Currently shares `FARMER` permissions.
- **`BUYER`**: Can create and manage their own requirements, view available produce, and manage their orders as a buyer.
- **`ADMIN`**: Has overarching access to platform data, can moderate users, and manage global settings.

## 5. Known Limitations Before Production Deployment
- **Refresh Tokens:** Currently, the system uses a single 24-hour access token. For production, a robust short-lived access token + long-lived refresh token mechanism should be implemented.
- **Rate Limiting:** Login and registration endpoints should have strict rate limiting to prevent brute-force attacks.
- **Database:** Local development uses SQLite. Production should use PostgreSQL for better concurrency and scalability.
