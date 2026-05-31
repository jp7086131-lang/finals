const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getById, listDocs, listDocsPage } = require('../services/firestoreService');
const { attachPaymentProof, confirmPayment, refundPayment, rejectPayment } = require('../services/paymentService');

const confirmRules = [
  body('orderId').trim().notEmpty(),
  body('reference').optional().trim().isLength({ min: 4, max: 80 }),
  body('idempotencyKey').optional().trim().isLength({ min: 8, max: 120 }),
  body('metadata').optional().isObject(),
];
const rejectRules = [
  body('orderId').trim().notEmpty(),
  body('reason').trim().isLength({ min: 4, max: 500 }),
  body('metadata').optional().isObject(),
];
const refundRules = [
  body('orderId').trim().notEmpty(),
  body('reason').trim().isLength({ min: 4, max: 500 }),
  body('metadata').optional().isObject(),
];

const getRules = [param('orderId').trim().notEmpty()];
const proofRules = [param('orderId').trim().notEmpty()];

function dateMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return new Date(value).getTime() || 0;
}

const confirm = asyncHandler(async (req, res) => {
  const payment = await confirmPayment({
    orderId: req.body.orderId,
    reference: req.body.reference,
    actor: req.user,
    idempotencyKey: req.body.idempotencyKey || req.get('idempotency-key') || '',
    metadata: req.body.metadata,
    req,
  });

  res.json({ payment });
});

const reject = asyncHandler(async (req, res) => {
  const payment = await rejectPayment({
    orderId: req.body.orderId,
    reason: req.body.reason,
    actor: req.user,
    metadata: req.body.metadata,
    req,
  });
  res.json({ payment });
});

const refund = asyncHandler(async (req, res) => {
  const payment = await refundPayment({
    orderId: req.body.orderId,
    reason: req.body.reason,
    actor: req.user,
    metadata: req.body.metadata,
    req,
  });
  res.json({ payment });
});

const uploadProof = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Payment proof image is required', 422);

  const proofUrl = `/uploads/payments/${req.file.filename}`;
  const result = await attachPaymentProof({
    orderId: req.params.orderId,
    actor: req.user,
    proofUrl,
    originalName: req.file.originalname,
    req,
  });

  res.status(201).json(result);
});

const getByOrder = asyncHandler(async (req, res) => {
  const order = await getById('orders', req.params.orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (req.user.role === 'customer' && order.customer !== req.user.id) {
    throw new AppError('Forbidden: cannot access this payment', 403);
  }

  if (req.user.role === 'rider' && order.rider !== req.user.id) {
    throw new AppError('Forbidden: cannot access this payment', 403);
  }

  const payments = await listDocs('payments', (query) => query.where('order', '==', order.id).limit(1));
  res.json({ payment: payments[0] || null });
});

const list = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new AppError('Forbidden: admin only', 403);
  const page = await listDocsPage('payments', req.query, (query) => query.orderBy('createdAt', 'desc'));
  const payments = page.rows;
  payments.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  res.json({ payments, pagination: page.pagination });
});

module.exports = { confirmRules, rejectRules, refundRules, getRules, proofRules, confirm, reject, refund, uploadProof, getByOrder, list };
