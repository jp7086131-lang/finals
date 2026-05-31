const env = require('./env');

// If credentials are present, initialize real firebase-admin and export its
// `admin`, `db`, and `storage` objects. Otherwise export a simple dev mock
// that provides the same shape but throws clear errors on real usage.
if (env.firebase.hasServiceAccountEnv || env.firebase.hasGoogleCredentials) {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    if (env.firebase.hasServiceAccountEnv) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey: env.firebase.privateKey,
        }),
        storageBucket: env.firebase.storageBucket,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: env.firebase.storageBucket,
      });
    }
  }

  const db = admin.firestore();
  try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
  const storage = admin.storage();
  module.exports = { admin, db, storage };
} else {
  // Dev mock
  // eslint-disable-next-line no-console
  console.warn('Firebase credentials not found; exporting DEV mock. Provide credentials for full functionality.');

  const mockDb = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false }),
        set: async () => { throw new Error('Firestore not configured (DEV)'); },
        update: async () => { throw new Error('Firestore not configured (DEV)'); },
        delete: async () => { throw new Error('Firestore not configured (DEV)'); },
      }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      orderBy: () => ({ offset: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }),
    }),
    FieldValue: { serverTimestamp: () => new Date() },
  };

  const mockStorage = { bucket: () => ({ upload: async () => { throw new Error('Storage not configured (DEV)'); } }) };

  const mockAuth = () => ({
    verifyIdToken: async () => { throw new Error('Firebase Auth not configured (DEV)'); },
    createUser: async () => { throw new Error('Firebase Auth not configured (DEV)'); },
    updateUser: async () => { throw new Error('Firebase Auth not configured (DEV)'); },
    setCustomUserClaims: async () => {},
  });

  const mockAdmin = {
    apps: [],
    auth: mockAuth,
    firestore: () => mockDb,
    storage: () => mockStorage,
  };

  module.exports = { admin: mockAdmin, db: mockDb, storage: mockStorage };
}
