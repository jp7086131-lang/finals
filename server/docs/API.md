  # MotoBook API Documentation

Base URL: `http://localhost:5000/api`

Authenticated routes require:

```http
Authorization: Bearer <jwt>
```

## Auth

### POST `/auth/register`

Customer registration only.

```json
{
  "name": "Juan Customer",
  "email": "juan@example.com",
  "password": "Password123",
  "phone": "09171234567",
  "address": "Makati City"
}
```

### POST `/auth/login`

```json
{
  "email": "juan@example.com",
  "password": "Password123"
}
```

### GET `/auth/me`

Returns current authenticated user.

### POST `/auth/logout`

Revokes the current JWT by adding it to a TTL blocklist.

## Users Admin

### GET `/users`

Admin only. Returns all users.

### PUT `/users/:id/role`

Admin only.

```json
{ "role": "rider" }
```

### PUT `/users/:id/active`

Admin only.

```json
{ "isActive": false }
```

## Categories

### GET `/categories`

Public list of active categories.

### POST `/categories`

Admin only.

```json
{ "name": "Rice Meals", "description": "Prepared meal sets" }
```

### PUT `/categories/:id`

Admin only.

### DELETE `/categories/:id`

Admin only.

## Products

### GET `/products`

Public active products. Optional query: `category`, `search`.

### GET `/products/low-stock`

Admin only.

### POST `/products`

Admin only.

```json
{
  "name": "Chicken Teriyaki Bowl",
  "description": "Rice bowl with teriyaki chicken",
  "price": 189,
  "image": "https://example.com/food.jpg",
  "category": "<categoryId>",
  "stockQuantity": 50,
  "lowStockThreshold": 10
}
```

### PUT `/products/:id`

Admin only.

### DELETE `/products/:id`

Admin only.

## Orders

### POST `/orders`

Customer only. Deducts stock and creates an unpaid payment record.

```json
{
  "items": [
    { "product": "<productId>", "quantity": 2 }
  ],
  "deliveryAddress": "BGC, Taguig",
  "paymentProvider": "gcash",
  "notes": "No onions"
}
```

### GET `/orders`

Admin sees all orders. Customers see their own. Riders see assigned orders.

### GET `/orders/:id`

Role-protected single order.

### PUT `/orders/:id/status`

Admin only.

```json
{ "status": "preparing" }
```

### PUT `/orders/:id/assign-rider`

Admin only.

```json
{ "riderId": "<userId>" }
```

### PUT `/orders/:id/delivery-status`

Rider only.

```json
{ "deliveryStatus": "on_the_way" }
```

## Riders

### GET `/riders/assigned`

Rider only. Active assigned deliveries.

### GET `/riders/history`

Rider only. Delivered or declined deliveries.

## Payments

### POST `/payments/confirm`

Admin or owning customer. Simulates QR payment confirmation.

```json
{
  "orderId": "<orderId>",
  "reference": "PAY-REFERENCE",
  "metadata": { "providerTraceId": "SIM-123" }
}
```

### GET `/payments/:orderId`

Role-protected payment details.

## Receipts

### GET `/receipts/:orderId`

Returns JSON/PDF-ready receipt data with items, totals, timestamp, and payment status.

## Analytics Admin

### GET `/analytics/sales`

Returns total sales, order count, average order value, and daily revenue series.

### GET `/analytics/orders`

Returns order status counts, top-selling products, and rider performance.

## Realtime Socket.IO

Connect with:

```js
io("http://localhost:5000", { auth: { token } })
```

Server places sockets in:

- `user:<userId>`
- `role:admin`
- `role:customer`
- `role:rider`

Events emitted:

- `orders:new`
- `orders:created`
- `orders:updated`
- `orders:assigned`
- `orders:status`
- `riders:assigned`
- `riders:delivery-status`
- `payments:confirmed`
