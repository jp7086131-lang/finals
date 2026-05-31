import { initializeApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './config';

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const canUseBrowserPersistence =
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined' &&
  typeof window.indexedDB !== 'undefined';

if (canUseBrowserPersistence) {
  try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence: multiple tabs open, persistence enabled in first tab only');
      } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence: not supported by this browser');
      }
    });
  } catch (e) {
    // Persistence setup is non-critical.
  }
}

// Use emulators in development
if (process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

export { db, auth, storage };
export default app;
