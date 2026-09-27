# API Reference

## Base URL
All API endpoints are relative to `http://localhost:3001/api`

## Response Format
The API uses a consistent JSON response format for all endpoints:

```json
{
  "success": true, // or false
  "message": "Optional status message",
  "data": { ... } // Present on success
}
```

---

## Authentication Endpoints

### 1. Register User
Registers a new user on the platform.

- **URL:** `/auth/register`
- **Method:** `POST`
- **Auth required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "Full Name",
    "role": "FARMER", // "FARMER" | "FPO" | "BUYER"
    "location": "Optional Location"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Full Name",
      "role": "FARMER"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing fields, invalid role, or email already in use.
  - `500 Internal Server Error`: Server errors.

### 2. Login User
Authenticates a user and returns a JWT.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Auth required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "Full Name",
        "role": "FARMER"
      }
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing credentials.
  - `401 Unauthorized`: Invalid credentials.

### 3. Get Current User
Retrieves the profile of the currently authenticated user.

- **URL:** `/auth/me`
- **Method:** `GET`
- **Auth required:** Yes (Bearer Token)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "Full Name",
        "role": "FARMER",
        "location": "Location",
        "createdAt": "2026-09-24T00:00:00.000Z"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: User no longer exists.

---

## Produce Endpoints

### 1. Get All Available Produce
- **URL:** `/produce`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any

### 2. Get My Produce
- **URL:** `/produce/mine`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** `FARMER`, `FPO`

### 3. Get Specific Produce
- **URL:** `/produce/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any

### 4. Create Produce
- **URL:** `/produce`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `FARMER`, `FPO`
- **Request Body:**
  ```json
  {
    "crop": "Tomato",
    "quantity": 500,
    "harvestDate": "2026-09-12T00:00:00Z",
    "location": "Karnataka",
    "qualityGrade": "Grade A",
    "expectedPrice": 29
  }
  ```

### 5. Update Produce
- **URL:** `/produce/:id`
- **Method:** `PATCH`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`

### 6. Delete Produce
- **URL:** `/produce/:id`
- **Method:** `DELETE`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`

---

## Requirement Endpoints

### 1. Get All Active Requirements
- **URL:** `/requirements`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any

### 2. Get My Requirements
- **URL:** `/requirements/mine`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** `BUYER`

### 3. Get Specific Requirement
- **URL:** `/requirements/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any

### 4. Create Requirement
- **URL:** `/requirements`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `BUYER`
- **Request Body:**
  ```json
  {
    "crop": "Tomato",
    "quantity": 1000,
    "qualityGrade": "Grade A",
    "deliveryLocation": "Bengaluru"
  }
  ```

### 5. Update Requirement
- **URL:** `/requirements/:id`
- **Method:** `PATCH`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`

### 6. Delete Requirement
- **URL:** `/requirements/:id`
- **Method:** `DELETE`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`

---

## Order Endpoints

### 1. Get All Orders
- **URL:** `/orders`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any (Users see their own, Admins see all)

### 2. Get My Orders
- **URL:** `/orders/mine`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Any

### 3. Get Specific Order
- **URL:** `/orders/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Owner (`buyerId` or `supplierId`) or `ADMIN`

### 4. Create Order
- **URL:** `/orders`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `BUYER`
- **Request Body:**
  ```json
  {
    "produceId": "uuid",
    "requirementId": "uuid (optional)",
    "quantity": 100
  }
  ```

### 5. Update Order Status
- **URL:** `/orders/:id/status`
- **Method:** `PATCH`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`
- **Request Body:**
  ```json
  {
    "status": "CONFIRMED",
    "description": "Optional status description",
    "location": "Optional location"
  }
  ```

### 6. Get Order Traceability Events
- **URL:** `/orders/:id/events`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Owner or `ADMIN`

---

## Matching Endpoints

### 1. Get Requirement Matches
- **URL:** `/matches`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** `BUYER`
- **Response:** Returns potential produce matches for the buyer's open requirements.

---

## Payments (Mock) Endpoints

### 1. Initialize Payment
- **URL:** `/payments`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `BUYER`
- **Request Body:**
  ```json
  {
    "orderId": "uuid",
    "idempotencyKey": "unique-string-uuid"
  }
  ```

### 2. Get Payment Details
- **URL:** `/payments/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Owner (`buyerId` or `supplierId` via order) or `ADMIN`

### 3. Get Order Payment
- **URL:** `/orders/:id/payment`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Owner (`buyerId` or `supplierId`) or `ADMIN`

### 4. Simulate Payment Webhook (Dev Only)
- **URL:** `/payments/:id/simulate`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `BUYER` or `ADMIN`
- **Request Body:**
  ```json
  {
    "success": true
  }
  ```

## Escrow (Dev Ledger)

### 1. Lock Escrow Funds
- **URL:** `/escrow/lock`
- **Method:** `POST`
- **Auth required:** Yes
- **Roles:** `BUYER`
- **Request Body:**
  ```json
  {
    "paymentId": "string",
    "idempotencyKey": "string"
  }
  ```

### 2. Get Order Escrow Entries
- **URL:** `/orders/:id/escrow`
- **Method:** `GET`
- **Auth required:** Yes
- **Roles:** Owner (`buyerId` or `supplierId`) or `ADMIN`
