const asyncHandler = require('../utils/asyncHandler');
const { enrichOrders } = require('../services/orderService');
const { listDocs } = require('../services/firestoreService');

function dateMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return new Date(value).getTime() || 0;
}

const assigned = asyncHandler(async (req, res) => {
  const orders = await listDocs('orders', (query) => query.where('rider', '==', req.user.id));
  const active = orders.filter((order) => ['assigned', 'accepted', 'picked_up', 'on_the_way'].includes(order.deliveryStatus));
  active.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  res.json({ orders: await enrichOrders(active) });
});

const history = asyncHandler(async (req, res) => {
  const orders = await listDocs('orders', (query) => query.where('rider', '==', req.user.id));
  const done = orders.filter((order) => ['delivered', 'declined'].includes(order.deliveryStatus));
  done.sort((a, b) => dateMillis(b.updatedAt) - dateMillis(a.updatedAt));
  res.json({ orders: await enrichOrders(done) });
});

module.exports = { assigned, history };
