# MotoBook Backend Setup with Firebase Firestore

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Firebase project

1. Go to Firebase Console: https://console.firebase.google.com/
2. Click **Add project**
3. Create a project, for example `motobook`
4. Open **Build > Firestore Database**
5. Click **Create database**
6. Choose a region
7. Start in production mode or test mode for local development

## 3. Create a Firebase service account

1. Firebase Console > Project settings
2. Open **Service accounts**
3. Click **Generate new private key**
4. Download the JSON file

## 4. Configure environment

Copy `.env.example` to `.env`.

Option A, recommended for local Windows:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\full\path\to\firebase-service-account.json
```

Option B, paste credentials directly:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

Required app variables:

- `JWT_SECRET`: long random secret.
- `CLIENT_URL`: React frontend origin.
- `PORT`: API port, default `5000`.

Example:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\you\Downloads\motobook-firebase-adminsdk.json
ADMIN_NAME=MotoBook Admin
ADMIN_EMAIL=admin@motobook.local
ADMIN_PASSWORD=ChangeMe123!
```

## 5. Create admin account

```bash
npm run seed:admin
```

## 6. Start API

```bash
npm run dev
```

Health check:

```http
GET http://localhost:5000/health
```

## Security Notes

- Passwords are hashed with bcrypt before storage in Firestore.
- JWTs are required for protected routes.
- Logout revokes tokens using a Firestore blocklist.
- Admin, customer, and rider access is enforced by middleware.
- Helmet, CORS, and rate limiting are enabled.
- Firestore Admin SDK bypasses Firestore client rules, so protect API routes carefully.

## Firestore Index Notes

Some combined queries may require Firestore composite indexes, especially when using `where(...)` plus `orderBy(...)`.
If Firestore returns an index error, open the generated Firebase Console link and create the suggested index.
