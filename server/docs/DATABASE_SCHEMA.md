# MotoBook Firestore Schema

Firebase Firestore stores data in collections. Document IDs are Firestore-generated strings unless noted.

## `users`

- `name`: string
- `email`: string, unique by application check
- `password`: bcrypt hash
- `role`: `admin | customer | rider`
- `phone`: string
- `address`: string
- `isActive`: boolean
- `lastLoginAt`: timestamp/null
- `createdAt`, `updatedAt`: Firestore server timestamps

## `categories`

- `name`: string
- `nameLower`: string for uniqueness/search
- `description`: string
- `isActive`: boolean
- `createdAt`, `updatedAt`: Firestore server timestamps

## `products`

- `name`: string
- `nameLower`: string for simple search
- `description`: string
- `price`: number
- `image`: string URL
- `category`: category document ID
- `stockQuantity`: number
- `lowStockThreshold`: number
- `isActive`: boolean
- `soldCount`: number
- `createdAt`, `updatedAt`: Firestore server timestamps

## `orders`

- `orderNumber`: human-readable order number
- `customer`: user document ID
- `rider`: user document ID/null
- `items`: snapshot array of `{ product, name, quantity, unitPrice, lineTotal }`
- `subtotal`, `tax`, `discount`, `deliveryFee`, `total`: numbers
- `status`: `pending | preparing | out_for_delivery | delivered | cancelled`
- `deliveryStatus`: `unassigned | assigned | accepted | picked_up | on_the_way | delivered | declined`
- `paymentStatus`: `unpaid | paid | refunded`
- `paymentReference`: unique payment reference
- `qrPayload`: JSON string for frontend QR generation
- `deliveryAddress`: string
- `notes`: string
- `deliveredAt`: ISO string/null
- `statusHistory`: audit array
- `createdAt`, `updatedAt`: Firestore server timestamps

Order creation uses a Firestore transaction to verify stock, deduct inventory, create the order, and create the payment record atomically.

## `payments`

- `order`: order document ID
- `customer`: user document ID
- `reference`: unique payment reference
- `provider`: `gcash | maya | cash_on_delivery`
- `amount`: number
- `status`: `unpaid | paid | failed | refunded`
- `confirmedBy`: user document ID/null
- `confirmedAt`: ISO string/null
- `metadata`: object
- `createdAt`, `updatedAt`: Firestore server timestamps

## `tokenBlocklists`

- document ID: SHA-256 hash of JWT
- `tokenHash`: SHA-256 hash of JWT
- `expiresAt`: ISO string
- `userId`: user document ID
- `createdAt`: Firestore server timestamp

For production, enable Firestore TTL on `tokenBlocklists.expiresAt` or keep the built-in lazy cleanup behavior.
