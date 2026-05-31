const asyncHandler = require('../utils/asyncHandler');
const { getById, listDocs } = require('../services/firestoreService');

function dateKey(value) {
  if (!value) return 'unknown';
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toISOString().slice(0, 10);
}

const sales = asyncHandler(async (req, res) => {
  const paidOrders = await listDocs('orders', (query) => query.where('paymentStatus', '==', 'verified'));
  const activePaid = paidOrders.filter((order) => order.status !== 'cancelled');
  const totalSales = activePaid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const orderCount = activePaid.length;
  const averageOrderValue = orderCount ? totalSales / orderCount : 0;

  const revenueMap = new Map();
  for (const order of activePaid) {
    const key = dateKey(order.createdAt);
    const current = revenueMap.get(key) || { _id: key, revenue: 0, orders: 0 };
    current.revenue += Number(order.total || 0);
    current.orders += 1;
    revenueMap.set(key, current);
  }

  res.json({
    summary: { totalSales, orderCount, averageOrderValue },
    revenueByDay: Array.from(revenueMap.values()).sort((a, b) => a._id.localeCompare(b._id)).slice(-31),
  });
});

const orders = asyncHandler(async (req, res) => {
  const [allOrders, products] = await Promise.all([listDocs('orders'), listDocs('products')]);

  const statusCounts = new Map();
  for (const order of allOrders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
  }

  const riderMap = new Map();
  for (const order of allOrders.filter((item) => item.rider)) {
    const row = riderMap.get(order.rider) || { riderId: order.rider, assigned: 0, delivered: 0 };
    row.assigned += 1;
    if (order.deliveryStatus === 'delivered') row.delivered += 1;
    riderMap.set(order.rider, row);
  }

  const riderPerformance = await Promise.all(Array.from(riderMap.values()).map(async (row) => {
    const rider = await getById('users', row.riderId);
    return { ...row, rider: rider ? { id: rider.id, name: rider.name, email: rider.email } : null };
  }));

  res.json({
    byStatus: Array.from(statusCounts.entries()).map(([_id, count]) => ({ _id, count })),
    topSellingProducts: products.sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0)).slice(0, 10),
    riderPerformance,
  });
});

module.exports = { sales, orders };
