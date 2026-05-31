import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/init';
import useMotoBookStore from '../store/useMotoBookStore';

export default function useFirebaseAuth() {
  const [loading, setLoading] = useState(process.env.NODE_ENV !== 'test');
  const [error, setError] = useState('');
  const { setUser, setUserProfile, startListeners, stopAllListeners, addToast } = useMotoBookStore();

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get token
        const token = await firebaseUser.getIdToken();

        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const profile = userDoc.exists() ? userDoc.data() : {};

        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || profile.name || firebaseUser.email?.split('@')[0] || 'User',
          role: profile.role || 'customer',
          isActive: profile.isActive !== false,
          phone: profile.phone || firebaseUser.phoneNumber || '',
          address: profile.address || '',
          photoURL: firebaseUser.photoURL || profile.photoURL || '',
          token,
          ...profile,
        };

        if (userData.isDeleted || userData.isActive === false) {
          await signOut(auth);
          setUser(null);
          setUserProfile(null);
          stopAllListeners();
          setError('Account is disabled.');
          setLoading(false);
          return;
        }

        setUser(userData);
        setUserProfile(profile);

        // Update online status
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        }, { merge: true });

        // Start real-time listeners
        startListeners(firebaseUser.uid, userData.role);
      } else {
        setUser(null);
        setUserProfile(null);
        stopAllListeners();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setUserProfile, startListeners, stopAllListeners]);

  const register = useCallback(async ({ email, password, name, phone, address, role = 'customer' }) => {
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, { displayName: name });

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        email,
        phone: phone || '',
        address: address || '',
        role,
        isActive: true,
        isOnline: true,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      return { success: true };
    } catch (err) {
      const message = friendlyAuthError(err.message);
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (err) {
      const message = friendlyAuthError(err.message);
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        }, { merge: true });
      }
      stopAllListeners();
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      addToast('Logged out successfully', 'info');
    } catch (err) {
      setError(err.message);
    }
  }, [stopAllListeners, setUser, setUserProfile, addToast]);

  return {
    loading,
    error,
    register,
    login,
    logout,
  };
}

function friendlyAuthError(message) {
  if (/user-not-found|wrong-password|invalid-credential/i.test(message)) {
    return 'Invalid email or password.';
  }
  if (/email-already-in-use/i.test(message)) {
    return 'This email is already registered.';
  }
  if (/weak-password/i.test(message)) {
    return 'Password should be at least 6 characters.';
  }
  if (/network-request-failed/i.test(message)) {
    return 'Network error. Check your connection.';
  }
  return message || 'An unexpected error occurred.';
}
