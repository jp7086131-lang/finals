const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function modulePath(relativePath) {
  return path.join(root, relativePath);
}

function mock(relativePath, exports) {
  const resolved = require.resolve(modulePath(relativePath));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

function fresh(relativePath) {
  const resolved = require.resolve(modulePath(relativePath));
  delete require.cache[resolved];
  return require(resolved);
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('auth registration rejects duplicate emails', async () => {
  mock('src/services/firestoreService.js', {
    listDocs: async () => [{ id: 'user-1', email: 'taken@example.com' }],
    createDoc: async () => {
      throw new Error('createDoc should not run for duplicates');
    },
    publicUser: (user) => user,
  });
  mock('src/services/tokenService.js', { signToken: () => 'token', blockToken: async () => {} });

  const { register } = fresh('src/controllers/authController.js');
  const req = { body: { name: 'Taken', email: 'taken@example.com', password: 'Password123!' } };
  const capturedError = await new Promise((resolve) => {
    register(req, responseRecorder(), resolve);
  });

  assert.equal(capturedError.statusCode, 409);
  assert.match(capturedError.message, /already registered/i);
});

test('payment confirmation rejects already-paid and cancelled orders', async () => {
  const updates = [];
  mock('src/services/firestoreService.js', {
    getById: async () => ({ id: 'order-1', customer: 'user-1', paymentStatus: 'paid', status: 'pending', paymentReference: 'PAY-1' }),
    listDocs: async () => [{ id: 'payment-1', status: 'unpaid' }],
    timestamp: () => '2026-05-15T00:00:00.000Z',
    updateDoc: async (collection, id, payload) => {
      updates.push({ collection, id, payload });
      return { id, ...payload };
    },
  });
  mock('src/services/socketService.js', { emitToAdmins: () => {}, emitToUser: () => {} });
  mock('src/services/orderService.js', { enrichOrder: async (order) => order });

  const { confirmPayment } = fresh('src/services/paymentService.js');

  await assert.rejects(
    confirmPayment({ orderId: 'order-1', reference: 'PAY-1', actor: { id: 'admin-1', role: 'admin' } }),
    /already paid/,
  );
  assert.equal(updates.length, 0);
});

test('rider delivery updates are scoped to the assigned rider and audited', async () => {
  let updatePayload;
  mock('src/services/firestoreService.js', {
    getById: async () => ({ id: 'order-1', customer: 'user-1', rider: 'rider-1', statusHistory: [] }),
    updateDoc: async (collection, id, payload) => {
      updatePayload = payload;
      return { id, ...payload };
    },
    timestamp: () => '2026-05-15T00:00:00.000Z',
  });
  mock('src/services/socketService.js', { emitToAdmins: () => {}, emitToRiders: () => {}, emitToUser: () => {} });

  const { updateDeliveryStatus } = fresh('src/services/orderService.js');
  const order = await updateDeliveryStatus('order-1', 'on_the_way', { id: 'rider-1', role: 'rider' });

  assert.equal(order.status, 'out_for_delivery');
  assert.equal(updatePayload.updatedBy, 'rider-1');
  assert.equal(updatePayload.statusHistory[0].status, 'on_the_way');
});

test('order creation deducts stock and creates unpaid payment atomically', async () => {
  const writes = [];
  const product = {
    id: 'product-1',
    name: 'Rice Bowl',
    price: 100,
    stockQuantity: 5,
    isActive: true,
  };
  const fakeAdmin = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'SERVER_TIME',
        increment: (value) => ({ increment: value }),
      },
    },
  };
  const productRef = { kind: 'product', id: 'product-1' };
  const orderRef = { id: 'order-1' };
  const paymentRef = { id: 'payment-1' };
  const db = {
    collection: (name) => ({
      doc: (id) => {
        if (name === 'products') return productRef;
        return name === 'orders' ? orderRef : paymentRef;
      },
    }),
    runTransaction: async (handler) => handler({
      get: async () => ({ exists: true, id: product.id, data: () => product }),
      update: (ref, payload) => writes.push({ type: 'update', ref, payload }),
      set: (ref, payload) => writes.push({ type: 'set', ref, payload }),
    }),
  };

  mock('src/services/firestoreService.js', {
    db,
    admin: fakeAdmin,
    getById: async () => null,
    now: () => 'SERVER_TIME',
    timestamp: () => '2026-05-15T00:00:00.000Z',
    updateDoc: async () => ({}),
  });
  mock('src/services/socketService.js', { emitToAdmins: () => {}, emitToRiders: () => {}, emitToUser: () => {} });

  const { createOrder } = fresh('src/services/orderService.js');
  await createOrder({
    customer: 'user-1',
    items: [{ product: 'product-1', quantity: 2 }],
    deliveryAddress: 'Makati City',
  });

  assert.equal(writes.find((write) => write.type === 'update').payload.stockQuantity.increment, -2);
  assert.equal(writes.filter((write) => write.type === 'set').length, 2);
  assert.equal(writes.find((write) => write.ref === paymentRef).payload.status, 'unpaid');
});
