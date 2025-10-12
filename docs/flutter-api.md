# Flutter Mobile API Documentation

This document describes the REST endpoints exposed at `/api/mobile` for the Flutter application. All endpoints return JSON responses and are available over HTTPS in production deployments.

## Base URL

```
https://profesionalservis.my.id/api/mobile
```

For tenant-specific deployments the same routes are also available under subdomains, e.g. `https://<tenant>.profesionalservis.my.id/api/mobile`, which map to the tenant resolved from the authenticated user context.【F:server/routes/mobile.ts†L96-L170】 During development you can target the local server (default `http://localhost:3000/api/mobile`). The mobile routes are registered directly on the Express application in `server/index.ts` and share middleware (logging, JSON parsing, tenant context) with the rest of the backend.【F:server/index.ts†L40-L83】

## Authentication

1. Obtain a JSON Web Token (JWT) by calling the **Login** endpoint.
2. Include the token in the `Authorization` header for every subsequent request:

```
Authorization: Bearer <token>
```

Each protected endpoint validates the Bearer token, resolves the tenant database for the associated client, and injects user/tenant context into the request.【F:server/routes/mobile.ts†L242-L315】 Tokens expire according to `MOBILE_JWT_EXPIRES_IN` (default `12h`).

Error responses follow the pattern:

```json
{
  "message": "Error description"
}
```

Validation failures include an `errors` object from Zod. Tenants that are unavailable return HTTP `503`.

### Multi-tenant Context

User accounts are scoped to a tenant (`clientId`). When a request is authenticated the API resolves the tenant metadata and provisions (or reuses) the tenant database connection before continuing.【F:server/routes/mobile.ts†L96-L170】【F:server/routes/mobile.ts†L242-L315】 The same token cannot access resources that belong to a different tenant, ensuring data isolation across subdomains such as `https://tenant-a.profesionalservis.my.id/api/mobile` and `https://tenant-b.profesionalservis.my.id/api/mobile`.

## Endpoints

### 1. POST `/login`

Authenticate a user and retrieve a session token.

**Request Body**

```json
{
  "username": "demo",
  "password": "secret"
}
```

Both fields are required strings.【F:server/routes/mobile.ts†L118-L205】

**Success Response**

```json
{
  "token": "<jwt>",
  "user": {
    "id": "usr_123",
    "clientId": "cli_123",
    "username": "demo",
    "email": "demo@example.com",
    "firstName": "Demo",
    "lastName": "User",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-05T08:30:00.000Z"
  },
  "tenant": {
    "id": "cli_123",
    "name": "Laptop POS Store",
    "subdomain": "laptoppos",
    "status": "active",
    "trialEndsAt": "2024-02-01T00:00:00.000Z"
  },
  "store": {
    "id": "cfg_123",
    "name": "Laptop POS Store",
    "address": "Jl. Mawar No.1",
    "phone": "+62 812-0000-0000",
    "email": "store@example.com",
    "taxRate": 11,
    "setupCompleted": true,
    "whatsappEnabled": true,
    "whatsappConnected": false
  }
}
```

The payload mirrors the sanitized user and store configuration objects returned by the backend.【F:server/routes/mobile.ts†L133-L218】

**Error Responses**

- `400 Bad Request` – validation errors with `errors` details.【F:server/routes/mobile.ts†L219-L239】
- `401 Unauthorized` – invalid credentials or token issues.【F:server/routes/mobile.ts†L182-L205】【F:server/routes/mobile.ts†L242-L315】
- `403 Forbidden` – user lacks a tenant association.【F:server/routes/mobile.ts†L186-L189】
- `503 Service Unavailable` – tenant database provisioning problem.【F:server/routes/mobile.ts†L231-L233】

### 2. GET `/me`

Fetch the authenticated user profile.

**Headers**

```
Authorization: Bearer <token>
```

**Response**

```json
{
  "user": {
    "id": "usr_123",
    "clientId": "cli_123",
    "username": "demo",
    "email": "demo@example.com",
    "firstName": "Demo",
    "lastName": "User",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-05T08:30:00.000Z"
  }
}
```

Returns the same sanitized structure as the login response.【F:server/routes/mobile.ts†L317-L335】

### 3. GET `/summary`

Retrieve dashboard metrics for the signed-in tenant.

**Headers**: `Authorization: Bearer <token>`

**Response**

```json
{
  "summary": {
    "todaySales": 1250000,
    "todayRevenue": 900000,
    "activeServices": 3,
    "lowStockCount": 7,
    "monthlyProfit": 4500000,
    "monthlySalesProfit": 3200000,
    "monthlyServiceProfit": 1300000,
    "whatsappConnected": true
  }
}
```

All numeric values are returned as numbers (defaults to `0` when unavailable). `whatsappConnected` indicates the WhatsApp integration status.【F:server/routes/mobile.ts†L338-L369】

### 4. GET `/store`

Fetch the store configuration for the tenant.

**Response**

```json
{
  "store": {
    "id": "cfg_123",
    "name": "Laptop POS Store",
    "address": "Jl. Mawar No.1",
    "phone": "+62 812-0000-0000",
    "email": "store@example.com",
    "taxRate": 11,
    "setupCompleted": true,
    "whatsappEnabled": true,
    "whatsappConnected": false
  }
}
```

The fields align with the sanitized store configuration helper used throughout the mobile routes.【F:server/routes/mobile.ts†L133-L174】【F:server/routes/mobile.ts†L373-L378】

### 5. GET `/categories`

List product categories scoped to the tenant.

**Response**

```json
{
  "categories": [
    {
      "id": "cat_123",
      "name": "Laptop",
      "description": "Semua jenis laptop"
    }
  ]
}
```

Categories are ordered alphabetically. The backend filters by `clientId` before returning the list.【F:server/routes/mobile.ts†L384-L423】

### 6. GET `/products`

Paginated list of products with optional search.

**Query Parameters**

- `page` (default `1`, minimum `1`)
- `limit` (default `20`, maximum `100`)
- `search` (optional string; matches name, SKU, brand, or model)

**Response**

```json
{
  "data": [
    {
      "id": "prd_123",
      "name": "Laptop Gaming",
      "description": "Laptop high-end",
      "sku": "LPT-001",
      "barcode": "1234567890123",
      "brand": "BrandX",
      "model": "GX1",
      "unit": "pcs",
      "sellingPrice": 14500000,
      "averageCost": 12000000,
      "stock": 5,
      "availableStock": 5,
      "reservedStock": 0,
      "minStock": 1,
      "maxStock": null,
      "categoryId": "cat_123",
      "categoryName": "Laptop"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Data entries include pricing, stock, and category information. The response also returns pagination metadata. Invalid query parameters trigger a `400` error with validation details.【F:server/routes/mobile.ts†L426-L543】

### 7. GET `/products/:id`

Retrieve a single product by its identifier.

**Path Parameter**

- `id` – product ID (string)

**Response**

```json
{
  "product": {
    "id": "prd_123",
    "name": "Laptop Gaming",
    "description": "Laptop high-end",
    "sku": "LPT-001",
    "barcode": "1234567890123",
    "brand": "BrandX",
    "model": "GX1",
    "unit": "pcs",
    "sellingPrice": 14500000,
    "averageCost": 12000000,
    "lastPurchasePrice": 11800000,
    "stock": 5,
    "availableStock": 5,
    "reservedStock": 0,
    "minStock": 1,
    "maxStock": null,
    "reorderPoint": null,
    "reorderQuantity": null,
    "specifications": {
      "cpu": "Intel i7",
      "ram": "16GB"
    },
    "categoryId": "cat_123",
    "categoryName": "Laptop"
  }
}
```

If the product does not exist or does not belong to the tenant, the API returns `404`. Validation failures (e.g., missing ID) return `400` with Zod error details.【F:server/routes/mobile.ts†L546-L652】

## Extended Feature Endpoints

The mobile API now mirrors the full web feature set so the Flutter client can manage every operational module directly from a phone or tablet.【F:server/routes/mobile.ts†L655-L1130】 The most notable additions are grouped below.

### Inventory Management

- `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` to create, update, and archive product categories with tenant scoping.【F:server/routes/mobile.ts†L655-L715】
- `POST /products`, `PUT /products/:id`, `DELETE /products/:id` for full product CRUD; SKUs/barcodes are auto-generated when omitted to match the web experience.【F:server/routes/mobile.ts†L717-L781】

### CRM (Customers & Suppliers)

- `GET /customers`, `GET /customers/:id`, plus `POST`, `PUT`, `DELETE` to manage the entire customer directory, including search support.【F:server/routes/mobile.ts†L783-L854】
- `GET /suppliers`, `GET /suppliers/:id`, and the corresponding `POST`, `PUT`, `DELETE` endpoints for supplier records.【F:server/routes/mobile.ts†L856-L922】

### Sales & Transactions

- `GET /transactions`, `GET /transactions/:id` expose full history with item breakdowns, while `POST /transactions` records new POS sales complete with automatic number generation and stock/finance integration.【F:server/routes/mobile.ts†L924-L995】

### Service Operations

- `GET /service-tickets`, detail view, parts lookup, and CRUD endpoints (`POST`, `PUT`, `DELETE`) let technicians work queues from mobile. Cancel flows reuse the same business-rule validation as the web dashboard.【F:server/routes/mobile.ts†L997-L1114】

### Inventory Movements & Stock Control

- `GET /stock-movements` and `POST /stock-movements` capture inbound/outbound adjustments with user attribution, keeping inventory figures consistent on mobile.【F:server/routes/mobile.ts†L1116-L1147】

### Finance & Reporting

- `GET /financial-records` and `POST /financial-records` manage bookkeeping entries, while the `/reports/*` endpoints deliver sales, service, financial, inventory, balance sheet, income statement, and chart-of-accounts data for dashboards.【F:server/routes/mobile.ts†L1149-L1229】

### Warranty Management

- `GET /warranty-claims`, detail retrieval, creation, status updates, processing, and validation mirror the desktop workflow so after-sales teams can operate entirely from mobile clients.【F:server/routes/mobile.ts†L1231-L1297】

## Error Handling Summary

| HTTP Status | When it occurs |
|-------------|----------------|
| `400` | Invalid request payload or query parameters (Zod validation).【F:server/routes/mobile.ts†L219-L224】【F:server/routes/mobile.ts†L534-L539】【F:server/routes/mobile.ts†L643-L647】 |
| `401` | Missing/invalid Bearer token, expired token, or login failures.【F:server/routes/mobile.ts†L182-L205】【F:server/routes/mobile.ts†L242-L312】 |
| `403` | Authenticated user lacks tenant association.【F:server/routes/mobile.ts†L186-L189】 |
| `404` | Resource not found (user or product).【F:server/routes/mobile.ts†L327-L328】【F:server/routes/mobile.ts†L587-L589】 |
| `500` | Unexpected server errors logged on the backend.【F:server/routes/mobile.ts†L237-L239】【F:server/routes/mobile.ts†L332-L335】【F:server/routes/mobile.ts†L368-L369】【F:server/routes/mobile.ts†L378-L380】【F:server/routes/mobile.ts†L541-L542】【F:server/routes/mobile.ts†L650-L651】 |
| `503` | Tenant database provisioning issues (retry later).【F:server/routes/mobile.ts†L231-L233】【F:server/routes/mobile.ts†L305-L307】 |

Use these responses to guide retry logic and user messaging inside the Flutter client.
