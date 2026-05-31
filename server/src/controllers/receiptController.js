const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getById } = require('../services/firestoreService');
const { enrichOrder } = require('../services/orderService');

const getReceipt = asyncHandler(async (req, res) => {
  const order = await getById('orders', req.params.orderId);
  if (!order) throw new AppError('Order not found', 404);

  const isCustomerOwner = req.user.role === 'customer' && order.customer === req.user.id;
  const isAssignedRider = req.user.role === 'rider' && order.rider === req.user.id;
  if (req.user.role !== 'admin' && !isCustomerOwner && !isAssignedRider) {
    throw new AppError('Forbidden: cannot access this receipt', 403);
  }

  const enriched = await enrichOrder(order);
  res.json({
    receipt: {
      orderId: enriched.id,
      orderNumber: enriched.orderNumber,
      customer: enriched.customer,
      rider: enriched.rider,
      items: enriched.items,
      subtotal: enriched.subtotal,
      tax: enriched.tax,
      discount: enriched.discount,
      deliveryFee: enriched.deliveryFee,
      total: enriched.total,
      paymentStatus: enriched.paymentStatus,
      paymentReference: enriched.paymentReference,
      timestamp: enriched.createdAt,
      printableWidth: ['58mm', '80mm'],
    },
  });
});

module.exports = { getReceipt };
