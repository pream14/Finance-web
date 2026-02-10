# Finance Collection Management System - API Documentation

## Base URL
`/api`

## Authentication
All endpoints (except login and register) require a valid session cookie. Authentication is enforced via the `session` HTTP-only cookie.

## Error Responses
All endpoints return standard error responses:
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Authentication Endpoints

### POST `/auth/login`
Log in a user and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "admin"
  }
}
```

**Status Codes:**
- `200`: Login successful
- `400`: Missing email or password
- `401`: Invalid credentials

---

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "fullName": "Jane Doe",
  "role": "collector",
  "phone": "+1-555-0000"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "fullName": "Jane Doe",
    "role": "collector"
  }
}
```

**Status Codes:**
- `201`: Account created successfully
- `400`: Missing required fields or invalid role
- `409`: Email already exists

---

### POST `/auth/logout`
Log out the current user and destroy session.

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/auth/me`
Get current authenticated user information.

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Status Codes:**
- `200`: User found
- `401`: Not authenticated

---

## Customer Endpoints

### GET `/customers`
Retrieve list of customers with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (active, paid, defaulted, suspended)
- `loanTypeId` (optional): Filter by loan type ID

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip_code": "62701",
    "loan_type_id": 1,
    "loan_type_name": "Personal Loan",
    "principal_amount": "10000.00",
    "interest_rate": "5.5",
    "start_date": "2024-01-01",
    "maturity_date": "2025-01-01",
    "status": "active",
    "notes": "Good payment history",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST `/customers`
Create a new customer record.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1-555-5678",
  "address": "456 Oak Ave",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62702",
  "loanTypeId": 2,
  "principalAmount": 150000,
  "interestRate": 4.5,
  "startDate": "2024-02-01",
  "maturityDate": "2034-02-01",
  "notes": "New home loan customer"
}
```

**Response (201 Created):**
Customer object (same structure as GET)

**Status Codes:**
- `201`: Customer created
- `400`: Missing required fields

---

### GET `/customers/[id]`
Get specific customer details.

**Response (200 OK):**
Customer object

**Status Codes:**
- `200`: Customer found
- `404`: Customer not found

---

### PUT `/customers/[id]`
Update customer information.

**Request Body:** (any combination of customer fields to update)
```json
{
  "status": "paid",
  "notes": "Loan paid in full"
}
```

**Response (200 OK):**
Updated customer object

**Status Codes:**
- `200`: Customer updated
- `400`: No valid fields to update
- `404`: Customer not found

---

### DELETE `/customers/[id]`
Delete a customer record.

**Response (200 OK):**
```json
{
  "message": "Customer deleted successfully"
}
```

**Status Codes:**
- `200`: Customer deleted
- `404`: Customer not found

---

## Collection Endpoints

### GET `/collections`
Retrieve collection entries with filtering.

**Query Parameters:**
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `collectorId` (optional): Filter by collector ID (admin only)

Note: Collectors can only view their own collections.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "collector_id": 2,
    "collector_name": "John Collector",
    "customer_id": 1,
    "customer_name": "John Smith",
    "collection_date": "2024-02-15",
    "amount_collected": "500.00",
    "payment_method": "cash",
    "notes": "Collected at office",
    "created_at": "2024-02-15T10:30:00Z",
    "updated_at": "2024-02-15T10:30:00Z"
  }
]
```

---

### POST `/collections`
Record a new collection entry.

**Request Body:**
```json
{
  "customerId": 1,
  "collectionDate": "2024-02-15",
  "amountCollected": 500.00,
  "paymentMethod": "cash",
  "notes": "Collected at customer location"
}
```

**Response (201 Created):**
Collection entry object

**Status Codes:**
- `201`: Collection recorded
- `400`: Missing required fields
- `401`: Not authenticated

Note: Collectors can only record their own collections.

---

## Expense Endpoints

**Authorization:** Admin only

### GET `/expenses`
Retrieve expense records (admin only).

**Query Parameters:**
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `category` (optional): Filter by category

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "description": "Office supplies",
    "amount": "150.00",
    "category": "office",
    "date": "2024-02-14",
    "created_by": 1,
    "created_by_name": "Admin User",
    "created_at": "2024-02-14T09:00:00Z",
    "updated_at": "2024-02-14T09:00:00Z"
  }
]
```

---

### POST `/expenses`
Create a new expense record (admin only).

**Request Body:**
```json
{
  "description": "Monthly utilities",
  "amount": 500.00,
  "category": "utilities",
  "date": "2024-02-15"
}
```

**Response (201 Created):**
Expense object

**Status Codes:**
- `201`: Expense created
- `400`: Missing required fields
- `403`: Admin access required

---

### DELETE `/expenses/[id]`
Delete an expense record (admin only).

**Response (200 OK):**
```json
{
  "message": "Expense deleted successfully"
}
```

**Status Codes:**
- `200`: Expense deleted
- `403`: Admin access required
- `404`: Expense not found

---

## Analytics Endpoints

**Authorization:** Admin only

### GET `/analytics`
Retrieve comprehensive analytics data (admin only).

**Query Parameters:**
- `startDate` (optional): Start date for analytics period
- `endDate` (optional): End date for analytics period

**Response (200 OK):**
```json
{
  "collectorMetrics": [
    {
      "id": 2,
      "full_name": "John Collector",
      "total_collections": 15,
      "total_amount": "7500.00",
      "avg_amount": "500.00"
    }
  ],
  "totalMetrics": {
    "total_entries": 45,
    "total_revenue": "22500.00"
  },
  "loanTypeMetrics": [
    {
      "name": "Personal Loan",
      "total_collections": 30,
      "total_amount": "15000.00"
    }
  ],
  "customerStatus": [
    {
      "status": "active",
      "count": 50,
      "total_amount": "500000.00"
    }
  ],
  "dailyTrend": [
    {
      "collection_date": "2024-02-15",
      "entries": 10,
      "daily_total": "5000.00"
    }
  ],
  "expenses": {
    "total_expenses": "2000.00",
    "expense_count": 5
  }
}
```

**Status Codes:**
- `200`: Analytics data retrieved
- `403`: Admin access required

---

## Common Query Parameters

### Date Filtering
All date parameters use ISO 8601 format: `YYYY-MM-DD`

Example:
```
GET /collections?startDate=2024-01-01&endDate=2024-02-15
```

### Sorting and Pagination
Most list endpoints return results sorted by creation date (newest first). Implement pagination client-side using the returned data.

---

## Rate Limiting
No rate limiting is currently implemented. Consider adding rate limiting for production deployments.

---

## Pagination
Pagination is implemented client-side. For large datasets, consider implementing server-side pagination.

---

## Status Codes Summary

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal server error |

---

## Examples

### Login Flow
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Create Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Cookie: session=SESSION_TOKEN" \
  -d '{
    "name":"Jane Smith",
    "phone":"+1-555-5678",
    "loanTypeId":1,
    "principalAmount":10000
  }'
```

### Record Collection
```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -H "Cookie: session=SESSION_TOKEN" \
  -d '{
    "customerId":1,
    "collectionDate":"2024-02-15",
    "amountCollected":500,
    "paymentMethod":"cash"
  }'
```

### Get Analytics
```bash
curl -X GET 'http://localhost:3000/api/analytics?startDate=2024-01-01&endDate=2024-02-15' \
  -H "Cookie: session=SESSION_TOKEN"
```
