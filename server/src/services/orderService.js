const { nanoid } = require('nanoid');
const AppError = require('../utils/AppError');
const { db, admin, getById, now, timestamp, updateDoc } = require('./firestoreService');
const { emitToAdmins, emitToRiders, emitToUser } = require('./socketService');
const { SERVICE_AREA, normalizeServiceAreaAddress } = require('../config/serviceArea');
const { auditLog } = require('./auditService');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');

const TAX_RATE = 0.12;
const DELIVERY_FEE = 49;

function makeOrderNumber() {
  return `MB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${nanoid(6).toUpperCase()}`;
}

function makePaymentReference() {
  return `PAY-${nanoid(12).toUpperCase()}`;
}

async function enrichOrder(order) {
  if (!order) return null;
  const [customer, rider] = await Promise.all([
    order.customer ? getById('users', order.customer) : null,
    order.rider ? getById('users', order.rider) : null,
  ]);

  if (customer) delete customer.password;
  if (rider) delete rider.password;

  return {
    ...order,
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } : order.customer,
    rider: rider ? { id: rider.id, name: rider.name, email: rider.email, phone: rider.phone } : order.rider,
  };
}

async function enrichOrders(orders) {
  return Promise.all(orders.map(enrichOrder));
}

async function createOrder({ customer, items, deliveryAddress, notes = '', discount = 0, paymentProvider = 'gcash' }) {
  if (!items?.length) throw new AppError('Cart is empty', 422);
  const scopedDeliveryAddress = normalizeServiceAreaAddress(deliveryAddress);

  const orderRef = db.collection('orders').doc();
  const paymentRef = db.collection('payments').doc();
  const paymentReference = makePaymentReference();
  let order;

  await db.runTransaction(async (transaction) => {
    const productRefs = items.map((item) => db.collection('products').doc(item.product));
    const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const orderItems = [];

    for (let index = 0; index < items.length; index += 1) {
      const snap = productSnaps[index];
      const item = items[index];
      const quantity = Number(item.quantity);

      if (!snap.exists) throw new AppError(`Product not found: ${item.product}`, 404);
      const product = { id: snap.id, ...snap.data() };
      if (!product.isActive) throw new AppError(`Product is inactive: ${product.name}`, 409);
      if (!Number.isInteger(quantity) || quantity < 1) throw new AppError('Invalid item quantity', 422);
      if (Number(product.stockQuantity) < quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 409, {
          productId: product.id,
          available: product.stockQuantity,
          requested: quantity,
        });
      }

      orderItems.push({
        product: product.id,
        name: product.name,
        quantity,
        unitPrice: Number(product.price),
        lineTotal: Number((Number(product.price) * quantity).toFixed(2)),
      });
    }

    const subtotal = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const safeDiscount = Math.min(Number(discount || 0), subtotal + tax);
    const deliveryFee = DELIVERY_FEE;
    const total = Number((subtotal + tax + deliveryFee - safeDiscount).toFixed(2));
    const qrPayload = JSON.stringify({ app: 'MotoBook', orderId: orderRef.id, paymentReference, amount: total });

    for (let index = 0; index < orderItems.length; index += 1) {
      const item = orderItems[index];
      transaction.update(productRefs[index], {
        stockQuantity: admin.firestore.FieldValue.increment(-item.quantity),
        soldCount: admin.firestore.FieldValue.increment(item.quantity),
        updatedAt: now(),
      });
    }

    order = {
      id: orderRef.id,
      orderNumber: makeOrderNumber(),
      customer,
      rider: null,
      items: orderItems,
      subtotal,
      tax,
      discount: safeDiscount,
      deliveryFee,
      total,
      status: 'pending',
      deliveryStatus: 'unassigned',
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentReference,
      qrPayload,
      deliveryAddress: scopedDeliveryAddress,
      pickupLocation: {
        name: SERVICE_AREA.pickupName,
        address: SERVICE_AREA.pickupAddress,
      },
      serviceArea: SERVICE_AREA.fullName,
      notes,
      createdBy: customer,
      updatedBy: customer,
      deliveredAt: null,
      statusHistory: [{ status: 'pending', by: customer, at: timestamp() }],
      createdAt: now(),
      updatedAt: now(),
    };

    transaction.set(orderRef, order);
    transaction.set(paymentRef, {
      id: paymentRef.id,
      order: orderRef.id,
      customer,
      reference: paymentReference,
      provider: paymentProvider,
      amount: total,
      status: PAYMENT_STATUS.PENDING,
      confirmedBy: null,
      confirmedAt: null,
      metadata: {},
      createdAt: now(),
      updatedAt: now(),
    });
  });

  const enriched = await enrichOrder({ ...order, id: orderRef.id });
  await auditLog({ actor: { id: customer, role: 'customer' }, action: 'create', resource: 'orders', resourceId: orderRef.id, after: enriched });
  emitToAdmins('orders:new', enriched);
  emitToUser(customer, 'orders:created', enriched);
  return enriched;
}

async function assignRider(orderId, riderId, actorId) {
  const rider = await getById('users', riderId);
  if (!rider || rider.role !== 'rider' || !rider.isActive) throw new AppError('Active rider not found', 404);

  const existing = await getById('orders', orderId);
  if (!existing) throw new AppError('Order not found', 404);

  const assignedAt = timestamp();
  const deliveryRef = db.collection('deliveries').doc();

  await db.runTransaction(async (transaction) => {
    transaction.update(db.collection('orders').doc(orderId), {
      rider: riderId,
      riderId,
      status: existing.status === 'pending' ? 'assigned' : existing.status,
      deliveryStatus: 'assigned',
      updatedBy: actorId,
      updatedAt: now(),
      statusHistory: [...(existing.statusHistory || []), { status: 'rider_assigned', by: actorId, at: assignedAt }],
    });

    transaction.set(deliveryRef, {
      id: deliveryRef.id,
      order: orderId,
      orderId,
      customer: existing.customer,
      customerId: existing.customer,
      rider: riderId,
      riderId,
      status: 'assigned',
      progress: 'assigned',
      pickupAddress: existing.pickupLocation?.address || SERVICE_AREA.pickupAddress,
      dropoffAddress: existing.deliveryAddress || '',
      serviceArea: existing.serviceArea || SERVICE_AREA.fullName,
      currentLocation: rider.currentLocation || null,
      eta: null,
      createdBy: actorId,
      assignedAt,
      createdAt: now(),
      updatedAt: now(),
    });

    transaction.set(db.collection('notifications').doc(), {
      receiverId: riderId,
      type: 'rider_assigned',
      title: 'New delivery assigned',
      message: `Order ${existing.orderNumber || orderId} is ready for dispatch.`,
      orderId,
      deliveryId: deliveryRef.id,
      isRead: false,
      createdAt: now(),
      updatedAt: now(),
    });
  });

  const order = await getById('orders', orderId);

  const enriched = await enrichOrder(order);
  await auditLog({ actor: { id: actorId, role: 'admin' }, action: 'assign_rider', resource: 'orders', resourceId: orderId, before: existing, after: order, metadata: { riderId } });
  emitToUser(existing.customer, 'orders:assigned', enriched);
  emitToUser(riderId, 'riders:assigned', enriched);
  emitToAdmins('orders:updated', enriched);
  return enriched;
}

async function updateOrderStatus(orderId, status, actor) {
  const allowed = ['pending', 'assigned', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) throw new AppError('Invalid order status', 422);

  const existing = await getById('orders', orderId);
  if (!existing) throw new AppError('Order not found', 404);

  if (actor.role === 'customer' && existing.customer !== actor.id) {
    throw new AppError('Forbidden: cannot update this order', 403);
  }

  const payload = {
    status,
    updatedBy: actor.id,
    statusHistory: [...(existing.statusHistory || []), { status, by: actor.id, at: timestamp() }],
  };

  if (status === 'delivered') {
    payload.deliveryStatus = 'delivered';
    payload.deliveredAt = timestamp();
  }
  if (status === 'cancelled') payload.deliveryStatus = 'cancelled';

  const order = await updateDoc('orders', orderId, payload);
  const enriched = await enrichOrder(order);
  await auditLog({ actor, action: 'update_status', resource: 'orders', resourceId: orderId, before: existing, after: order, metadata: { status } });

  emitToUser(existing.customer, 'orders:status', enriched);
  if (existing.rider) emitToUser(existing.rider, 'orders:status', enriched);
  emitToAdmins('orders:updated', enriched);
  return enriched;
}

async function updateDeliveryStatus(orderId, deliveryStatus, rider) {
  const allowed = ['accepted', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'declined'];
  if (!allowed.includes(deliveryStatus)) throw new AppError('Invalid delivery status', 422);

  const existing = await getById('orders', orderId);
  if (!existing || existing.rider !== rider.id) throw new AppError('Assigned order not found', 404);

  const payload = {
    deliveryStatus,
    updatedBy: rider.id,
    statusHistory: [...(existing.statusHistory || []), { status: deliveryStatus, by: rider.id, at: timestamp() }],
  };

  if (deliveryStatus === 'on_the_way') payload.status = 'out_for_delivery';
  if (deliveryStatus === 'delivered') {
    payload.status = 'delivered';
    payload.deliveredAt = timestamp();
  }

  const order = await updateDoc('orders', orderId, payload);
  const enriched = await enrichOrder(order);
  await auditLog({ actor: rider, action: 'update_delivery_status', resource: 'orders', resourceId: orderId, before: existing, after: order, metadata: { deliveryStatus } });

  emitToAdmins('riders:delivery-status', enriched);
  emitToUser(existing.customer, 'orders:status', enriched);
  emitToUser(rider.id, 'riders:delivery-status', enriched);
  return enriched;
}

async function announceRiderAvailability() {
  emitToRiders('riders:refresh', { at: new Date().toISOString() });
}

module.exports = {
  createOrder,
  assignRider,
  updateOrderStatus,
  updateDeliveryStatus,
  announceRiderAvailability,
  enrichOrder,
  enrichOrders,
};
