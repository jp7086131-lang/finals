import { create } from 'zustand';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/init';
import { request } from '../api/client';

function orderCustomerId(order) {
  if (!order) return '';
  if (typeof order.customer === 'string') return order.customer;
  return order.customer?.id || order.customerId || '';
}

function orderRiderId(order) {
  if (!order) return '';
  if (typeof order.rider === 'string') return order.rider;
  return order.rider?.id || order.riderId || '';
}

function mergeOrderIdentity(order) {
  return {
    ...order,
    customerId: orderCustomerId(order),
    riderId: orderRiderId(order),
  };
}

const useMotoBookStore = create((set, get) => ({
  // Auth state
  user: null,
  userProfile: null,
  isAuthenticated: false,

  // Data collections
  orders: [],
  notifications: [],
  deliveries: [],
  users: [],
  products: [],
  categories: [],
  payments: [],
  carts: [],
  pendingProductImages: {},

  // UI state
  loading: process.env.NODE_ENV !== 'test',
  notice: '',
  toasts: [],
  unreadNotifications: 0,
  notificationSoundEnabled: true,
  onlineUsers: {},

  // Real-time listeners registry
  _listeners: [],

  // ─── Auth Actions ────────────────────────────────────────────
  setUser: (user) =>
    set({ user, isAuthenticated: !!user, loading: user ? true : false }),

  setUserProfile: (profile) =>
    set({ userProfile: profile }),

  updateMyProfile: async (updates) => {
    const { user } = get();
    if (!user?.uid) {
      get().addToast('You need to be signed in to update your profile', 'error');
      return false;
    }

    const cleanUpdates = {
      name: String(updates.name || '').trim(),
      phone: String(updates.phone || '').trim(),
      address: String(updates.address || '').trim(),
    };

    if (!cleanUpdates.name) {
      get().addToast('Name is required', 'warning');
      return false;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...cleanUpdates,
        updatedAt: serverTimestamp(),
      });
      set((state) => ({
        user: { ...state.user, ...cleanUpdates },
        userProfile: { ...state.userProfile, ...cleanUpdates },
      }));
      get().addToast('Profile updated', 'success');
      return true;
    } catch (error) {
      get().addToast(`Failed to update profile: ${error.message}`, 'error');
      return false;
    }
  },

  // ─── Toast System ────────────────────────────────────────────
  addToast: (message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setNotice: (message) => set({ notice: message }),

  clearNotice: () => set({ notice: '' }),

  // ─── Notifications ───────────────────────────────────────────
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { id: `notif-${Date.now()}`, createdAt: new Date().toISOString(), ...notification },
        ...state.notifications,
      ].slice(0, 50),
      unreadNotifications: state.unreadNotifications + 1,
    })),

  markNotificationsRead: async () => {
    const { notifications, user } = get();
    const unread = notifications.filter((notification) => !notification.isRead);

    set({
      unreadNotifications: 0,
      notifications: notifications.map((notification) => ({ ...notification, isRead: true })),
    });

    if (!user?.uid || unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((notification) => {
        batch.update(doc(db, 'notifications', notification.id), {
          isRead: true,
          read: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      get().addToast(`Failed to mark notifications read: ${error.message}`, 'error');
    }
  },

  clearNotifications: async () => {
    const { notifications, user } = get();
    set({ notifications: [], unreadNotifications: 0 });

    if (!user?.uid || notifications.length === 0) return;

    try {
      await Promise.all(notifications.map((notification) => deleteDoc(doc(db, 'notifications', notification.id))));
    } catch (error) {
      get().addToast(`Failed to clear notifications: ${error.message}`, 'error');
    }
  },

  toggleNotificationSound: () =>
    set((state) => ({ notificationSoundEnabled: !state.notificationSoundEnabled })),

  // ─── Data Mutations ──────────────────────────────────────────
  setOrders: (orders) => set({ orders }),
  setNotifications: (notifications) => set({ notifications }),
  setDeliveries: (deliveries) => set({ deliveries }),
  setUsers: (users) => set({ users }),
  setProducts: (products) => set({ products }),
  rememberProductImage: (productId, image) => set((state) => ({
    pendingProductImages: image ? { ...state.pendingProductImages, [productId]: image } : state.pendingProductImages,
  })),
  setCategories: (categories) => set({ categories }),
  setPayments: (payments) => set({ payments }),
  setCarts: (carts) => set({ carts }),
  setLoading: (loading) => set({ loading }),

  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, ...updates } : o
      ),
    })),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    })),

  // ─── Firestore Write Actions ─────────────────────────────────
  updateOrderStatus: async (orderId, status, additionalUpdates = {}) => {
    try {
      const token = get().user?.token;
      if (token) {
        const data = await request(`/orders/${orderId}/status`, {
          token,
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        get().updateOrder(orderId, mergeOrderIdentity(data.order));
      } else {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status,
          updatedAt: serverTimestamp(),
          ...additionalUpdates,
        });
        get().updateOrder(orderId, { status, ...additionalUpdates });
      }
      get().addToast(`Order status updated to ${status.replace(/_/g, ' ')}`, 'success');
      return true;
    } catch (error) {
      get().addToast(`Failed to update order: ${error.message}`, 'error');
      return false;
    }
  },

  assignRider: async (orderId, riderId, riderName) => {
    try {
      const token = get().user?.token;
      if (token) {
        const data = await request(`/orders/${orderId}/assign-rider`, {
          token,
          method: 'PUT',
          body: JSON.stringify({ riderId }),
        });
        get().updateOrder(orderId, mergeOrderIdentity(data.order));
      } else {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          riderId,
          'rider.name': riderName,
          'rider.id': riderId,
          deliveryStatus: 'assigned',
          status: 'assigned',
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'deliveries'), {
          orderId,
          riderId,
          status: 'assigned',
          progress: 'assigned',
          eta: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'notifications'), {
          receiverId: riderId,
          type: 'rider_assigned',
          title: 'New delivery assigned',
          message: `Order ${orderId} has been assigned to you.`,
          orderId,
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        get().updateOrder(orderId, {
          riderId,
          rider: { id: riderId, name: riderName },
          deliveryStatus: 'assigned',
          status: 'assigned',
        });
      }
      get().addToast(`Rider ${riderName} assigned to order`, 'success');
      return true;
    } catch (error) {
      get().addToast(`Failed to assign rider: ${error.message}`, 'error');
      return false;
    }
  },

  updateDeliveryStatus: async (orderId, deliveryStatus, additionalUpdates = {}) => {
    try {
      const token = get().user?.token;
      if (token) {
        const data = await request(`/orders/${orderId}/delivery-status`, {
          token,
          method: 'PUT',
          body: JSON.stringify({ deliveryStatus }),
        });
        get().updateOrder(orderId, mergeOrderIdentity(data.order));
      } else {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          deliveryStatus,
          updatedAt: serverTimestamp(),
          ...additionalUpdates,
        });
        get().updateOrder(orderId, { deliveryStatus, ...additionalUpdates });
      }
      return true;
    } catch (error) {
      get().addToast(`Failed to update delivery: ${error.message}`, 'error');
      return false;
    }
  },

  uploadPaymentProof: async (orderId, file) => {
    try {
      const token = get().user?.token;
      if (!token) throw new Error('Authentication token is required');

      const body = new FormData();
      body.append('proofFile', file);
      const data = await request(`/payments/${orderId}/proof`, {
        token,
        method: 'POST',
        body,
      });
      const proofUrl = data.order?.paymentProof || data.payment?.metadata?.proofUrl || '';
      if (data.order) get().updateOrder(orderId, mergeOrderIdentity(data.order));
      get().addToast('Payment proof uploaded successfully', 'success');
      return proofUrl;
    } catch (error) {
      get().addToast(`Failed to upload payment proof: ${error.message}`, 'error');
      return null;
    }
  },

  verifyPayment: async (orderId) => {
    try {
      const token = get().user?.token;
      if (token) {
        await request('/payments/confirm', {
          token,
          method: 'POST',
          body: JSON.stringify({ orderId }),
        });
      } else {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          paymentStatus: 'verified',
          updatedAt: serverTimestamp(),
        });
      }
      get().updateOrder(orderId, { paymentStatus: 'verified' });
      get().addToast('Payment verified successfully', 'success');
      return true;
    } catch (error) {
      get().addToast(`Failed to verify payment: ${error.message}`, 'error');
      return false;
    }
  },

  // ─── Real-time Listeners ─────────────────────────────────────
  startListeners: (userId, userRole) => {
    const { _listeners } = get();
    // Clean up existing listeners
    get().stopAllListeners();

    const newListeners = [];

    // 1. Orders listener - role-based queries
    let ordersQuery;
    if (userRole === 'customer') {
      ordersQuery = query(
        collection(db, 'orders'),
        where('customer', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (userRole === 'rider') {
      ordersQuery = query(
        collection(db, 'orders'),
        where('rider', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      // Admin sees all
      ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const ordersUnsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
          orders.push(mergeOrderIdentity({ id: doc.id, ...doc.data() }));
        });
        set({ orders });
        set({ loading: false });
      },
      (error) => {
        console.error('Orders listener error:', error);
        set({ loading: false });
      }
    );
    newListeners.push(ordersUnsub);

    // 2. Notifications listener. Supports both receiverId and uid schemas.
    const notificationBuckets = { receiverId: [], uid: [] };
    const publishNotifications = () => {
      const seen = new Set();
      const notifications = [...notificationBuckets.receiverId, ...notificationBuckets.uid]
        .filter((notification) => {
          if (seen.has(notification.id)) return false;
          seen.add(notification.id);
          return true;
        })
        .sort((a, b) => {
          const first = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const second = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return second - first;
        })
        .slice(0, 50);
      set({
        notifications,
        unreadNotifications: notifications.filter((notification) => !notification.isRead && !notification.read).length,
      });
    };

    const notifReceiverQuery = query(
      collection(db, 'notifications'),
      where('receiverId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const notifReceiverUnsub = onSnapshot(notifReceiverQuery, (snapshot) => {
      notificationBuckets.receiverId = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      publishNotifications();
    });
    newListeners.push(notifReceiverUnsub);

    const notifUidQuery = query(
      collection(db, 'notifications'),
      where('uid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const notifUidUnsub = onSnapshot(notifUidQuery, (snapshot) => {
      notificationBuckets.uid = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      publishNotifications();
    });
    newListeners.push(notifUidUnsub);

    // 3. Deliveries listener (for riders and admin)
    if (userRole === 'admin' || userRole === 'rider') {
      const deliveryQuery = userRole === 'rider'
        ? query(collection(db, 'deliveries'), where('riderId', '==', userId), orderBy('createdAt', 'desc'))
        : query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'), limit(50));

      const deliveryUnsub = onSnapshot(deliveryQuery, (snapshot) => {
        const deliveries = [];
        snapshot.forEach((doc) => deliveries.push({ id: doc.id, ...doc.data() }));
        set({ deliveries });
      });
      newListeners.push(deliveryUnsub);
    }

    // 4. Users listener (admin only)
    if (userRole === 'admin') {
      const usersQuery = query(collection(db, 'users'), limit(100));
      const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
        const users = [];
        const onlineUsers = {};
        snapshot.forEach((doc) => {
          const user = { id: doc.id, ...doc.data() };
          if (user.isDeleted) return;
          users.push(user);
          onlineUsers[doc.id] = user.isOnline === true;
        });
        set({ users, onlineUsers });
      });
      newListeners.push(usersUnsub);
    }

    // 5. Products listener
    const productsQuery = query(collection(db, 'products'), limit(100));
    const productsUnsub = onSnapshot(productsQuery, (snapshot) => {
      const pendingProductImages = get().pendingProductImages;
      const products = [];
      snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        products.push(pendingProductImages[doc.id] && !product.image
          ? { ...product, image: pendingProductImages[doc.id] }
          : product);
      });
      set({
        products: userRole === 'admin'
          ? products.filter((product) => !product.isDeleted)
          : products.filter((product) => !product.isDeleted && product.isActive !== false),
      });
    });
    newListeners.push(productsUnsub);

    // 6. Categories listener
    const categoriesUnsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const categories = [];
      snapshot.forEach((doc) => categories.push({ id: doc.id, ...doc.data() }));
      set({
        categories: userRole === 'admin'
          ? categories.filter((category) => !category.isDeleted)
          : categories.filter((category) => !category.isDeleted && category.isActive !== false),
      });
    });
    newListeners.push(categoriesUnsub);

    // 7. Payments listener (admin only)
    if (userRole === 'admin') {
      const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(50));
      const paymentsUnsub = onSnapshot(paymentsQuery, (snapshot) => {
        const payments = [];
        snapshot.forEach((doc) => payments.push({ id: doc.id, ...doc.data() }));
        set({ payments });
      });
      newListeners.push(paymentsUnsub);
    }

    set({ _listeners: newListeners });
  },

  stopAllListeners: () => {
    const { _listeners } = get();
    _listeners.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    set({ _listeners: [], onlineUsers: {} });
  },

  // ─── Online Status ───────────────────────────────────────────
  setUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: isOnline },
    })),
}));

export default useMotoBookStore;
