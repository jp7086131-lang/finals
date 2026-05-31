const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getById, listDocs, listDocsPage } = require('../services/firestoreService');
const { assignRider, createOrder, enrichOrder, enrichOrders, updateDeliveryStatus, updateOrderStatus } = require('../services/orderService');
const { SERVICE_AREA, isInServiceArea } = require('../config/serviceArea');

const createRules = [
  body('items').isArray({ min: 1 }),
  body('items.*.product').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('deliveryAddress').trim().isLength({ min: 5, max: 240 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('paymentProvider').optional().isIn(['gcash', 'maya', 'cash_on_delivery']),
];

const statusRules = [
  param('id').trim().notEmpty(),
  body('status').isIn(['pending', 'assigned', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
];

const assignRules = [
  param('id').trim().notEmpty(),
  body('riderId').trim().notEmpty(),
];

const deliveryRules = [
  param('id').trim().notEmpty(),
  body('deliveryStatus').isIn(['accepted', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'declined']),
];

function dateMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return new Date(value).getTime() || 0;
}

function paginateRows(rows, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25));
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

const create = asyncHandler(async (req, res) => {
  if (!isInServiceArea(req.body.deliveryAddress)) {
    throw new AppError(`MotoBook currently delivers only within ${SERVICE_AREA.fullName}.`, 422);
  }

  const order = await createOrder({
    customer: req.user.id,
    items: req.body.items,
    deliveryAddress: req.body.deliveryAddress,
    notes: req.body.notes,
    discount: req.body.discount,
    paymentProvider: req.body.paymentProvider,
  });

  res.status(201).json({ order });
});

const list = asyncHandler(async (req, res) => {
  let page;
  if (req.user.role === 'customer') {
    const rows = await listDocs('orders', (query) => query.where('customer', '==', req.user.id));
    rows.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
    page = paginateRows(rows, req.query);
  } else if (req.user.role === 'rider') {
    const rows = await listDocs('orders', (query) => query.where('rider', '==', req.user.id));
    rows.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
    page = paginateRows(rows, req.query);
  } else {
    page = await listDocsPage('orders', req.query, (query) => query.orderBy('createdAt', 'desc'));
  }

  let orders = page.rows;
  orders.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));

  res.json({ orders: await enrichOrders(orders), pagination: page.pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const order = await getById('orders', req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const isCustomerOwner = req.user.role === 'customer' && order.customer === req.user.id;
  const isAssignedRider = req.user.role === 'rider' && order.rider === req.user.id;
  if (req.user.role !== 'admin' && !isCustomerOwner && !isAssignedRider) {
    throw new AppError('Forbidden: cannot access this order', 403);
  }

  res.json({ order: await enrichOrder(order) });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(req.params.id, req.body.status, req.user);
  res.json({ order });
});

const cancel = asyncHandler(async (req, res) => {
  const order = await getById('orders', req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (req.user.role !== 'customer' || order.customer !== req.user.id) {
    throw new AppError('Forbidden: cannot cancel this order', 403);
  }
  if (!['pending', 'preparing'].includes(order.status)) {
    throw new AppError('This order can no longer be cancelled', 409);
  }

  const updated = await updateOrderStatus(req.params.id, 'cancelled', req.user);
  res.json({ order: updated });
});

const assign = asyncHandler(async (req, res) => {
  const order = await assignRider(req.params.id, req.body.riderId, req.user.id);
  res.json({ order });
});

const updateDelivery = asyncHandler(async (req, res) => {
  const order = await updateDeliveryStatus(req.params.id, req.body.deliveryStatus, req.user);
  res.json({ order });
});

module.exports = { createRules, statusRules, assignRules, deliveryRules, create, list, getOne, updateStatus, cancel, assign, updateDelivery };
