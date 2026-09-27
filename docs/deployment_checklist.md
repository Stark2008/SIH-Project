# Deployment Checklist

The Farmer Connect application is built using a React (Vite) frontend and an Express/TypeScript backend. Ensure the following configurations are met before deploying to a platform (e.g., Vercel, Railway, Render, or AWS).

## 1. Environment Configuration (`.env`)
The production environment *must* explicitly define:
- `NODE_ENV=production`
- `JWT_SECRET` (Must be a cryptographically secure, random 64+ character string. The backend will crash if omitted in production).
- `DATABASE_URL="file:./dev.db"` (Or mapped to a persistent volume claim if deploying containerized SQLite).
- `PORT` (Typically injected by the hosting provider).
- `ALLOWED_ORIGIN` (Must strictly match the production frontend domain, e.g., `https://farmer-connect-demo.com`).

## 2. Build Pipeline
Execute these commands sequentially in your CI/CD pipeline:
1. `npm install` (Root directory)
2. `cd server && npm install`
3. `cd server && npx prisma generate`
4. `cd server && npm run build` (Compiles Express)
5. `cd .. && npm run build` (Compiles React via Vite)

## 3. Database Initialization (SQLite specific)
Since SQLite is file-based, deploying to a stateless container (like Heroku) will wipe data on every restart. 
- **Requirement**: Use a persistent volume to mount the `/server/prisma` directory. 
- **Migration**: Run `npx prisma db push` or `npx prisma migrate deploy` on the first startup.
- **Seed**: Run `npm run seed` to establish the prototype demo accounts and mock catalog.

## 4. Frontend Serving
Ensure your hosting provider is configured to route all unknown frontend routes back to `index.html` to support React Router (though the current prototype relies mostly on internal state variables to switch pages, it is standard practice).

## 5. Security & Verification
- Verify that `cors` options correctly consume `ALLOWED_ORIGIN`.
- Ensure mock payment credentials or real gateway credentials are NOT embedded in the client bundle.
- Ensure `.env` is fully excluded via `.gitignore`.
