const AppError = require('../utils/AppError');
const { auditLog } = require('./auditService');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { getById, listDocs, timestamp, updateDoc } = require('./firestoreService');
const { emitToAdmins, emitToUser } = require('./socketService');
const { enrichOrder } = require('./orderService');

async function findPaymentForOrder(orderId) {
  const payments = await listDocs('payments', (query) => query.where('order', '==', orderId).limit(1));
  return payments[0] || null;
}

async function confirmPayment({ orderId, reference, actor, idempotencyKey = '', metadata = {}, req = null }) {
  const order = await getById('orders', orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.status === 'cancelled') throw new AppError('Cannot confirm payment for a cancelled order', 409);
  if (actor.role !== 'admin' && actor.role !== 'super_admin') throw new AppError('Only admins can verify payments', 403);

  if (reference && order.paymentReference !== reference) {
    throw new AppError('Payment reference does not match order', 422);
  }

  const payment = await findPaymentForOrder(orderId);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status === PAYMENT_STATUS.VERIFIED) return payment;
  if ([PAYMENT_STATUS.REJECTED, PAYMENT_STATUS.REFUNDED].includes(payment.status)) throw new AppError(`Cannot verify a ${payment.status} payment`, 409);

  const existingKeys = payment.metadata?.idempotencyKeys || [];
  if (idempotencyKey && existingKeys.includes(idempotencyKey)) return payment;

  const updatedPayment = await updateDoc('payments', payment.id, {
    status: PAYMENT_STATUS.VERIFIED,
    verifiedBy: actor.id,
    verifiedAt: timestamp(),
    metadata: {
      ...(payment.metadata || {}),
      ...metadata,
      idempotencyKeys: idempotencyKey ? [...existingKeys, idempotencyKey] : existingKeys,
    },
  });

  const updatedOrder = await updateDoc('orders', orderId, { paymentStatus: PAYMENT_STATUS.VERIFIED });
  const enrichedOrder = await enrichOrder(updatedOrder);
  await auditLog({ req, actor, action: 'verify_payment', resource: 'payments', resourceId: payment.id, before: payment, after: updatedPayment, metadata: { orderId } });

  emitToAdmins('payments:verified', { order: enrichedOrder, payment: updatedPayment });
  emitToUser(order.customer, 'payments:verified', { order: enrichedOrder, payment: updatedPayment });
  return updatedPayment;
}

async function attachPaymentProof({ orderId, actor, proofUrl, originalName, req = null }) {
  const order = await getById('orders', orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.status === 'cancelled') throw new AppError('Cannot upload payment proof for a cancelled order', 409);
  if (order.paymentStatus === PAYMENT_STATUS.VERIFIED) throw new AppError('Order is already paid', 409);

  if (actor.role !== 'admin' && order.customer !== actor.id) {
    throw new AppError('Forbidden: cannot upload proof for this order', 403);
  }

  const payment = await findPaymentForOrder(orderId);
  if (!payment) throw new AppError('Payment not found', 404);
  if ([PAYMENT_STATUS.VERIFIED, PAYMENT_STATUS.REFUNDED].includes(payment.status)) {
    throw new AppError(`Cannot upload proof for a ${payment.status} payment`, 409);
  }

  const metadata = {
    ...(payment.metadata || {}),
    proofUrl,
    originalName: originalName || '',
    uploadedBy: actor.id,
    uploadedAt: timestamp(),
  };

  const updatedPayment = await updateDoc('payments', payment.id, {
    status: PAYMENT_STATUS.UNDER_REVIEW,
    metadata,
  });
  const updatedOrder = await updateDoc('orders', orderId, {
    paymentStatus: PAYMENT_STATUS.UNDER_REVIEW,
    paymentProof: proofUrl,
    paymentProofUploadedAt: timestamp(),
  });
  const enrichedOrder = await enrichOrder(updatedOrder);
  await auditLog({ req, actor, action: 'upload_payment_proof', resource: 'payments', resourceId: payment.id, before: payment, after: updatedPayment, metadata: { orderId, proofUrl } });

  emitToAdmins('payments:proof-uploaded', { order: enrichedOrder, payment: updatedPayment });
  emitToUser(order.customer, 'payments:proof-uploaded', { order: enrichedOrder, payment: updatedPayment });
  return { payment: updatedPayment, order: enrichedOrder };
}

async function rejectPayment({ orderId, reason, actor, metadata = {}, req = null }) {
  const order = await getById('orders', orderId);
  if (!order) throw new AppError('Order not found', 404);
  const payment = await findPaymentForOrder(orderId);
  if (!payment) throw new AppError('Payment not found', 404);
  if ([PAYMENT_STATUS.VERIFIED, PAYMENT_STATUS.REFUNDED].includes(payment.status)) throw new AppError(`Cannot reject a ${payment.status} payment`, 409);

  const updatedPayment = await updateDoc('payments', payment.id, {
    status: PAYMENT_STATUS.REJECTED,
    rejectedBy: actor.id,
    rejectedAt: timestamp(),
    rejectionReason: reason,
    metadata: { ...(payment.metadata || {}), ...metadata, rejectionReason: reason },
  });
  const updatedOrder = await updateDoc('orders', orderId, { paymentStatus: PAYMENT_STATUS.REJECTED });
  const enrichedOrder = await enrichOrder(updatedOrder);
  await auditLog({ req, actor, action: 'reject_payment', resource: 'payments', resourceId: payment.id, before: payment, after: updatedPayment, metadata: { orderId, reason } });
  emitToAdmins('payments:rejected', { order: enrichedOrder, payment: updatedPayment });
  emitToUser(order.customer, 'payments:rejected', { order: enrichedOrder, payment: updatedPayment });
  return updatedPayment;
}

async function refundPayment({ orderId, reason, actor, metadata = {}, req = null }) {
  const order = await getById('orders', orderId);
  if (!order) throw new AppError('Order not found', 404);
  const payment = await findPaymentForOrder(orderId);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.VERIFIED) throw new AppError('Only verified payments can be refunded', 409);

  const updatedPayment = await updateDoc('payments', payment.id, {
    status: PAYMENT_STATUS.REFUNDED,
    refundedBy: actor.id,
    refundedAt: timestamp(),
    refundReason: reason,
    metadata: { ...(payment.metadata || {}), ...metadata, refundReason: reason },
  });
  const updatedOrder = await updateDoc('orders', orderId, { paymentStatus: PAYMENT_STATUS.REFUNDED });
  const enrichedOrder = await enrichOrder(updatedOrder);
  await auditLog({ req, actor, action: 'refund_payment', resource: 'payments', resourceId: payment.id, before: payment, after: updatedPayment, metadata: { orderId, reason } });
  emitToAdmins('payments:refunded', { order: enrichedOrder, payment: updatedPayment });
  emitToUser(order.customer, 'payments:refunded', { order: enrichedOrder, payment: updatedPayment });
  return updatedPayment;
}

module.exports = { PAYMENT_STATUS, confirmPayment, attachPaymentProof, rejectPayment, refundPayment };
