import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, ShoppingBag, Users, Bike, CreditCard, Clock, 
  CheckCircle, AlertTriangle, X, ChevronRight, DollarSign,
  Activity, RefreshCw, BarChart3, Bell, UserCheck, UserX,
  FolderTree, Settings, Plus, Pencil, Trash2, Save, Printer, Download, ShieldCheck,
  Search, MapPin, Phone, Package, Calendar, Filter, SlidersHorizontal, UserRound,
  Route, Truck, Eye, Ban, ClipboardList, LockKeyhole, Upload, Shield, Mail, MoreHorizontal,
  Star, Navigation, Wallet, Timer, MapPinned, Power, PowerOff
} from 'lucide-react';
import useMotoBookStore from '../store/useMotoBookStore';
import RealTimeDeliveryTracker from './RealTimeDeliveryTracker';
import ReceiptPreview from './ReceiptPreview';
import { imageUrl, request } from '../api/client';
import { asDate, exportRows, peso } from '../utils/format';

export default function AdminDashboard({ activePage = 'Dashboard' }) {
  const { orders, users, products, notifications, onlineUsers, categories } = useMotoBookStore();
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Render dashboard or other pages based on activePage
  if (activePage === 'Dashboard') {
    return <DashboardView orders={orders} users={users} products={products} notifications={notifications} onlineUsers={onlineUsers} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />;
  }
  if (activePage === 'Orders') {
    return <OrdersPage orders={orders} users={users} onlineUsers={onlineUsers} />;
  }
  if (activePage === 'Products') {
    return <ProductsPage products={products} categories={categories} />;
  }
  if (activePage === 'Categories') {
    return <CategoriesPage categories={categories} products={products} />;
  }
  if (activePage === 'Users' || activePage === 'Customers') {
    return <CustomersPage users={users} orders={orders} />;
  }
  if (activePage === 'Riders') {
    return <RidersPage users={users} orders={orders} onlineUsers={onlineUsers} />;
  }
  if (activePage === 'Payments') {
    return <PaymentsPage orders={orders} />;
  }
  if (activePage === 'Reports') {
    return <ReportsPage orders={orders} />;
  }
  if (activePage === 'Audit Trail') {
    return <AuditTrailPage orders={orders} users={users} products={products} categories={categories} />;
  }
  if (activePage === 'Settings') {
    return <SettingsPage />;
  }

  return <DashboardView orders={orders} users={users} products={products} notifications={notifications} onlineUsers={onlineUsers} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />;
}

function DashboardView({ orders, users, products, notifications, onlineUsers, selectedOrder, setSelectedOrder }) {

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'paid' || o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const activeDeliveries = orders.filter(
      (o) => ['assigned', 'accepted', 'picked_up', 'on_the_way'].includes(o.deliveryStatus)
    ).length;
    const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
    const totalRiders = users.filter((u) => u.role === 'rider').length;
    const onlineRiders = users.filter((u) => u.role === 'rider' && onlineUsers[u.id]).length;
    const totalCustomers = users.filter((u) => u.role === 'customer').length;
    const unverifiedPayments = orders.filter((o) => o.paymentStatus === 'pending_verification').length;

    return { totalOrders, totalRevenue, activeDeliveries, pendingOrders, totalRiders, onlineRiders, totalCustomers, unverifiedPayments };
  }, [orders, users, onlineUsers]);

  const liveOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.deliveryStatus) && o.status !== 'cancelled'
  );

  return (
    <section className="admin-dashboard">
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <StatCard 
          icon={DollarSign} 
          label="Total Revenue" 
          value={`₱${Number(stats.totalRevenue).toLocaleString()}`}
          trend="+ real-time" 
          color="cyan" 
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Total Orders" 
          value={stats.totalOrders} 
          trend="+ live" 
          color="violet" 
        />
        <StatCard 
          icon={Bike} 
          label="Active Deliveries" 
          value={stats.activeDeliveries} 
          trend="+ dispatch" 
          color="teal" 
        />
        <StatCard 
          icon={Clock} 
          label="Pending Orders" 
          value={stats.pendingOrders} 
          trend="- queue" 
          color="gold" 
        />
        <StatCard 
          icon={Users} 
          label="Online Riders" 
          value={`${stats.onlineRiders}/${stats.totalRiders}`} 
          trend="+ available" 
          color="emerald" 
        />
        <StatCard 
          icon={CreditCard} 
          label="Unverified Payments" 
          value={stats.unverifiedPayments} 
          trend="- review" 
          color="rose" 
        />
      </div>

      {/* Live Orders & Selected Order Detail */}
      <div className="admin-live-section">
        <div className="admin-live-orders glass-panel">
          <div className="panel-header">
            <h3>
              <Activity size={18} />
              Live Orders
              <motion.span 
                className="live-dot" 
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </h3>
            <span className="order-count">{liveOrders.length} active</span>
          </div>

          <div className="live-orders-list">
            <AnimatePresence>
              {liveOrders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={32} />
                  <p>No live orders</p>
                  <small>Orders will appear here in real time</small>
                </div>
              ) : (
                liveOrders.map((order) => (
                  (() => {
                    const customer = getCustomerInfo(order, users);
                    return (
                  <motion.div
                    key={order.id}
                    className={`live-order-item ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="live-order-main">
                      <strong>{order.orderNumber || order.id?.slice(0, 8)}</strong>
                      <span className="customer-name">{customer.name}</span>
                    </div>
                    <div className="live-order-meta">
                      <span className="order-amount">₱{Number(order.total || 0).toLocaleString()}</span>
                      <AdminStatusBadge status={order.deliveryStatus || order.status} />
                    </div>
                    <div className="live-order-time">
                      {order.createdAt?.toDate ? 
                        order.createdAt.toDate().toLocaleTimeString() : 
                        new Date(order.createdAt || Date.now()).toLocaleTimeString()
                      }
                    </div>
                  </motion.div>
                    );
                  })()
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Order Detail */}
        <div className="admin-order-detail">
          {selectedOrder ? (
            <AdminOrderDetail 
              order={selectedOrder} 
              users={users}
              onlineUsers={onlineUsers}
              onClose={() => setSelectedOrder(null)} 
            />
          ) : (
            <div className="admin-detail-placeholder glass-panel">
              <ChevronRight size={32} />
              <p>Select an order to view details</p>
              <small>Manage status, assign riders, verify payments</small>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Delivery Tracker for selected order */}
      {selectedOrder && (
        <RealTimeDeliveryTracker order={selectedOrder} />
      )}

      {/* Online Users */}
      <div className="admin-online-section glass-panel">
        <div className="panel-header">
          <h3><Users size={18} /> Online Users</h3>
        </div>
        <div className="online-users-grid">
          {users.filter((u) => u.role !== 'admin').slice(0, 10).map((u) => {
            const isOnline = onlineUsers[u.id];
            return (
              <div key={u.id} className={`online-user-card ${isOnline ? 'online' : 'offline'}`}>
                <span className="user-avatar">{u.name?.charAt(0) || '?'}</span>
                <div>
                  <strong>{u.name}</strong>
                  <small>{u.role}</small>
                </div>
                {isOnline ? <UserCheck size={14} className="online-icon" /> : <UserX size={14} className="offline-icon" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const ORDER_STATUSES = ['pending', 'assigned', 'preparing', 'picked_up', 'on_the_way', 'out_for_delivery', 'arrived', 'delivered', 'cancelled'];
const DELIVERY_STEPS = ['assigned', 'preparing', 'picked_up', 'on_the_way', 'delivered'];

function getOrderStatus(order) {
  const status = order?.deliveryStatus === 'unassigned' ? order?.status : (order?.deliveryStatus || order?.status);
  return status || 'pending';
}

function getRiderId(order) {
  return order?.riderId || (typeof order?.rider === 'string' ? order.rider : order?.rider?.id) || '';
}

function getRiderName(order, users = []) {
  const riderId = getRiderId(order);
  return order?.rider?.name || users.find((user) => user.id === riderId)?.name || '';
}

function getCustomerId(order) {
  return order?.customerId || (typeof order?.customer === 'string' ? order.customer : order?.customer?.id) || '';
}

function getCustomerInfo(order, users = []) {
  const customerId = getCustomerId(order);
  const profile = users.find((user) => user.id === customerId || user.uid === customerId) || {};
  const embedded = typeof order?.customer === 'object' ? order.customer : {};
  return {
    id: customerId,
    name: embedded.name || profile.fullname || profile.name || order?.customerName || 'Customer',
    email: embedded.email || profile.email || order?.customerEmail || '',
    phone: embedded.phone || profile.phone || order?.customerPhone || '',
    address: order?.deliveryAddress || order?.address || embedded.address || profile.address || '',
  };
}

function formatDateTime(value) {
  const date = asDate(value) || new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

function itemTotal(item) {
  return Number(item.lineTotal ?? (item.price || item.unitPrice || 0) * (item.quantity || 1));
}

// Page Views
function OrdersPage({ orders = [], users = [], onlineUsers = {} }) {
  const { updateOrderStatus, assignRider, addToast, user } = useMotoBookStore();
  const [filters, setFilters] = useState({ order: '', customer: '', address: '', status: 'all', payment: 'all', rider: 'all', from: '', to: '', sort: 'latest' });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignOrder, setAssignOrder] = useState(null);
  const [statusOrder, setStatusOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedFilters(filters), 250);
    return () => clearTimeout(id);
  }, [filters]);

  const riders = useMemo(() => users.filter((item) => item.role === 'rider' && item.isActive !== false), [users]);
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => ['pending', 'unassigned'].includes(getOrderStatus(order))).length,
    assigned: orders.filter((order) => getOrderStatus(order) === 'assigned' || getRiderId(order)).length,
    delivering: orders.filter((order) => ['picked_up', 'on_the_way', 'out_for_delivery', 'arrived'].includes(getOrderStatus(order))).length,
    delivered: orders.filter((order) => getOrderStatus(order) === 'delivered' || order.status === 'delivered').length,
    cancelled: orders.filter((order) => getOrderStatus(order) === 'cancelled' || order.status === 'cancelled').length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const from = debouncedFilters.from ? new Date(`${debouncedFilters.from}T00:00:00`).getTime() : null;
    const to = debouncedFilters.to ? new Date(`${debouncedFilters.to}T23:59:59`).getTime() : null;
    return orders
      .filter((order) => {
        const status = getOrderStatus(order);
        const created = asDate(order.createdAt)?.getTime() || 0;
        const payment = order.paymentProvider || order.paymentMethod || order.paymentStatus || 'unpaid';
        const riderId = getRiderId(order);
        const customer = getCustomerInfo(order, users);
        return (!debouncedFilters.order || `${order.orderNumber || ''} ${order.id || ''}`.toLowerCase().includes(debouncedFilters.order.toLowerCase()))
          && (!debouncedFilters.customer || `${customer.name || ''} ${customer.phone || ''} ${customer.email || ''}`.toLowerCase().includes(debouncedFilters.customer.toLowerCase()))
          && (!debouncedFilters.address || `${order.deliveryAddress || order.address || ''}`.toLowerCase().includes(debouncedFilters.address.toLowerCase()))
          && (debouncedFilters.status === 'all' || status === debouncedFilters.status || order.status === debouncedFilters.status)
          && (debouncedFilters.payment === 'all' || payment === debouncedFilters.payment || order.paymentStatus === debouncedFilters.payment)
          && (debouncedFilters.rider === 'all' || riderId === debouncedFilters.rider || (debouncedFilters.rider === 'unassigned' && !riderId))
          && (!from || created >= from)
          && (!to || created <= to);
      })
      .sort((a, b) => {
        const first = asDate(a.createdAt)?.getTime() || 0;
        const second = asDate(b.createdAt)?.getTime() || 0;
        return debouncedFilters.sort === 'oldest' ? first - second : second - first;
      });
  }, [orders, users, debouncedFilters]);

  useEffect(() => setPage(1), [debouncedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pageOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));

  const handleAssign = async (order, rider) => {
    const ok = await assignRider(order.id, rider.id, rider.name || 'Rider');
    if (ok) setAssignOrder(null);
  };

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel ${order.orderNumber || order.id}?`)) return;
    await updateOrderStatus(order.id, 'cancelled', { deliveryStatus: 'cancelled' });
  };

  return (
    <section className="admin-page admin-orders-workspace">
      <div className="orders-command-header">
        <div>
          <span className="eyebrow">Dispatch operations</span>
          <h2><ClipboardList size={24} /> Order Management</h2>
          <p>Realtime order queue, rider assignment, payment review, and delivery tracking.</p>
        </div>
      </div>

      <div className="order-stat-grid" aria-label="Order statistics">
        <OrderMetric icon={ShoppingBag} label="Total Orders" value={stats.total} tone="cyan" />
        <OrderMetric icon={Clock} label="Pending Orders" value={stats.pending} tone="yellow" />
        <OrderMetric icon={UserCheck} label="Assigned Orders" value={stats.assigned} tone="blue" />
        <OrderMetric icon={Truck} label="Delivering" value={stats.delivering} tone="purple" />
        <OrderMetric icon={CheckCircle} label="Delivered" value={stats.delivered} tone="green" />
        <OrderMetric icon={Ban} label="Cancelled" value={stats.cancelled} tone="red" />
      </div>

      <div className="orders-filter-panel glass-panel" aria-label="Order filters">
        <FilterInput icon={Search} label="Order ID" value={filters.order} onChange={(value) => updateFilter('order', value)} placeholder="MB-..." />
        <FilterInput icon={UserRound} label="Customer" value={filters.customer} onChange={(value) => updateFilter('customer', value)} placeholder="Name or phone" />
        <FilterSelect icon={Bike} label="Rider" value={filters.rider} onChange={(value) => updateFilter('rider', value)}>
          <option value="all">All riders</option>
          <option value="unassigned">Unassigned</option>
          {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name || rider.email}</option>)}
        </FilterSelect>
        <FilterSelect icon={CreditCard} label="Payment" value={filters.payment} onChange={(value) => updateFilter('payment', value)}>
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="cash_on_delivery">COD</option>
          <option value="cod">COD</option>
          <option value="pending_verification">Pending verification</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
        </FilterSelect>
        <FilterSelect icon={Filter} label="Status" value={filters.status} onChange={(value) => updateFilter('status', value)}>
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
        </FilterSelect>
        <FilterInput icon={Calendar} label="From" type="date" value={filters.from} onChange={(value) => updateFilter('from', value)} />
        <FilterInput icon={Calendar} label="To" type="date" value={filters.to} onChange={(value) => updateFilter('to', value)} />
        <FilterSelect icon={SlidersHorizontal} label="Sort" value={filters.sort} onChange={(value) => updateFilter('sort', value)}>
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
        </FilterSelect>
        <span className="filter-result-count">{filteredOrders.length} result{filteredOrders.length === 1 ? '' : 's'}</span>
      </div>

      {orders.length === 0 ? (
        <OrderEmptyState title="No orders yet" message="Orders will appear here as customers check out." />
      ) : pageOrders.length === 0 ? (
        <OrderEmptyState title="No matching orders" message="Adjust the filters to widen the dispatch queue." />
      ) : (
        <>
          <OrdersDataTable
            orders={pageOrders}
            users={users}
            onView={setSelectedOrder}
            onAssign={setAssignOrder}
            onStatus={setStatusOrder}
            onPrint={setReceiptOrder}
            onCancel={handleCancel}
          />
          <div className="orders-pagination glass-panel">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </>
      )}

      <AssignRiderModal order={assignOrder} riders={riders} onlineUsers={onlineUsers} orders={orders} onAssign={handleAssign} onClose={() => setAssignOrder(null)} />
      <OrderStatusModal order={statusOrder} onUpdate={updateOrderStatus} onClose={() => setStatusOrder(null)} />
      <OrderDetailsModal order={selectedOrder} users={users} onAssign={() => { setAssignOrder(selectedOrder); setSelectedOrder(null); }} onClose={() => setSelectedOrder(null)} />
      <AdminReceiptModal order={receiptOrder} token={user?.token} onClose={() => setReceiptOrder(null)} />
    </section>
  );
}

function OrdersDataTable({ orders, users, onView, onAssign, onStatus, onPrint, onCancel }) {
  return (
    <section className="orders-table-shell glass-panel" aria-label="Orders table">
      <div className="orders-table-scroll">
        <table className="orders-data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Contact Number</th>
              <th>Address</th>
              <th>Items Ordered</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Rider</th>
              <th>Delivery Status</th>
              <th>Date &amp; Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderTableRow
                key={order.id}
                order={order}
                users={users}
                onView={() => onView(order)}
                onAssign={() => onAssign(order)}
                onStatus={() => onStatus(order)}
                onPrint={() => onPrint(order)}
                onCancel={() => onCancel(order)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="orders-mobile-list">
        {orders.map((order) => (
          <OrderMobileCard
            key={order.id}
            order={order}
            users={users}
            onView={() => onView(order)}
            onAssign={() => onAssign(order)}
            onStatus={() => onStatus(order)}
            onPrint={() => onPrint(order)}
            onCancel={() => onCancel(order)}
          />
        ))}
      </div>
    </section>
  );
}

function OrderTableRow({ order, users, onView, onAssign, onStatus, onPrint, onCancel }) {
  const status = getOrderStatus(order);
  const customer = getCustomerInfo(order, users);
  const riderName = getRiderName(order, users);

  return (
    <tr>
      <td><strong className="order-table-id">{order.orderNumber || order.id?.slice(0, 8)}</strong></td>
      <td><span className="order-table-customer">{customer.name}</span></td>
      <td><a className="order-table-link" href={customer.phone ? `tel:${customer.phone}` : undefined}>{customer.phone || 'No phone'}</a></td>
      <td><span className="order-table-address">{customer.address || 'No delivery address'}</span></td>
      <td><span className="order-table-items">{formatOrderItems(order.items)}</span></td>
      <td><strong>{peso(order.total)}</strong></td>
      <td><span className="order-table-method">{formatPaymentMethod(order)}</span></td>
      <td><PaymentBadge status={normalizePaymentStatus(order)} /></td>
      <td><span className={riderName ? 'rider-chip assigned' : 'rider-chip'}>{riderName || 'Unassigned'}</span></td>
      <td><AdminStatusBadge status={status} /></td>
      <td><span className="order-table-date">{formatDateTime(order.createdAt)}</span></td>
      <td><OrderActionButtons onView={onView} onAssign={onAssign} onStatus={onStatus} onPrint={onPrint} onCancel={onCancel} /></td>
    </tr>
  );
}

function OrderMobileCard({ order, users, onView, onAssign, onStatus, onPrint, onCancel }) {
  const status = getOrderStatus(order);
  const customer = getCustomerInfo(order, users);
  const riderName = getRiderName(order, users);

  return (
    <details className="order-mobile-card">
      <summary>
        <span>
          <strong>{order.orderNumber || order.id?.slice(0, 8)}</strong>
          <small>{customer.name} • {peso(order.total)}</small>
        </span>
        <AdminStatusBadge status={status} />
      </summary>
      <div className="order-mobile-grid">
        <span><small>Contact</small><b>{customer.phone || 'No phone'}</b></span>
        <span><small>Address</small><b>{customer.address || 'No delivery address'}</b></span>
        <span><small>Items</small><b>{formatOrderItems(order.items)}</b></span>
        <span><small>Payment</small><b>{formatPaymentMethod(order)}</b></span>
        <span><small>Payment Status</small><PaymentBadge status={normalizePaymentStatus(order)} /></span>
        <span><small>Rider</small><b>{riderName || 'Unassigned'}</b></span>
        <span><small>Date & Time</small><b>{formatDateTime(order.createdAt)}</b></span>
      </div>
      <OrderActionButtons onView={onView} onAssign={onAssign} onStatus={onStatus} onPrint={onPrint} onCancel={onCancel} />
    </details>
  );
}

function OrderActionButtons({ onView, onAssign, onStatus, onPrint, onCancel }) {
  return (
    <div className="order-table-actions">
      <button type="button" onClick={onView} aria-label="View order details" data-tooltip="View"><Eye size={15} /></button>
      <button type="button" onClick={onAssign} aria-label="Assign rider" data-tooltip="Assign Rider"><Bike size={15} /></button>
      <button type="button" onClick={onStatus} aria-label="Update status" data-tooltip="Update Status"><RefreshCw size={15} /></button>
      <button type="button" onClick={onPrint} aria-label="Print receipt" data-tooltip="Print Receipt"><Printer size={15} /></button>
      <button type="button" className="danger" onClick={onCancel} aria-label="Cancel order" data-tooltip="Cancel Order"><X size={15} /></button>
    </div>
  );
}

function formatOrderItems(items = []) {
  if (!items.length) return 'No items listed';
  const preview = items.slice(0, 2).map((item) => `${item.name || item.product || 'Item'} x${item.quantity || 1}`).join(', ');
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
}

function formatPaymentMethod(order) {
  const value = order.paymentProvider || order.paymentMethod || (order.paymentStatus === 'cod' ? 'COD' : 'Not set');
  return String(value).replace(/_/g, ' ');
}

function normalizePaymentStatus(order) {
  const status = order.paymentStatus || 'unpaid';
  if (['cod', 'cash_on_delivery'].includes(status) || ['cod', 'cash_on_delivery'].includes(order.paymentMethod)) return 'cod';
  return status;
}

function LegacyOrdersPage({ orders, users, onlineUsers }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const status = order.deliveryStatus || order.status || 'pending';
      const payment = order.paymentStatus || 'unpaid';
      const text = [
        order.orderNumber,
        order.id,
        order.customer?.name,
        order.customer?.email,
        order.deliveryAddress,
        status,
        payment,
      ].filter(Boolean).join(' ').toLowerCase();

      return (!term || text.includes(term))
        && (statusFilter === 'all' || status === statusFilter || order.status === statusFilter)
        && (paymentFilter === 'all' || payment === paymentFilter);
    });
  }, [orders, search, statusFilter, paymentFilter]);

  return (
    <section className="admin-page orders-page">
      <div className="page-header">
        <h2><ShoppingBag size={24} /> Orders</h2>
        <p>Manage all orders</p>
      </div>
      <div className="admin-filter-bar glass-panel">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, address" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="assigned">Assigned</option>
          <option value="on_the_way">On the way</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_verification">Pending verification</option>
          <option value="paid">Paid</option>
        </select>
        <span>{filteredOrders.length} result{filteredOrders.length === 1 ? '' : 's'}</span>
      </div>
      {!orders || orders.length === 0 ? (
        <div className="glass-panel empty-state">
          <ShoppingBag size={40} />
          <p>No orders yet</p>
          <small>Orders will appear here</small>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel empty-state">
          <ShoppingBag size={40} />
          <p>No matching orders</p>
          <small>Adjust the search or filters.</small>
        </div>
      ) : (
        <div className="orders-container">
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <motion.div 
                key={order.id} 
                className="order-card glass-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="order-header">
                  <div className="order-number">
                    <strong>{order.orderNumber || `Order ${order.id?.slice(0, 8)}`}</strong>
                    <small>{order.id}</small>
                  </div>
                  <AdminStatusBadge status={order.deliveryStatus || order.status} />
                </div>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span className="value">{order.customer?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Total:</span>
                    <span className="value">₱{Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className="value">{(order.status || 'pending').replace(/_/g, ' ')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Payment:</span>
                    <span className={`payment-status ${order.paymentStatus}`}>
                      {(order.paymentStatus || 'unpaid').replace(/_/g, ' ')}
                    </span>
                  </div>
                  {order.deliveryAddress && (
                    <div className="detail-row">
                      <span className="label">Delivery:</span>
                      <span className="value">{order.deliveryAddress}</span>
                    </div>
                  )}
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="order-items">
                    <small className="items-label">Items ({order.items.length}):</small>
                    <div className="items-list">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="item-tag">
                          {item.name || item.product} x{item.quantity || 1}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="order-time">
                  <small>
                    {order.createdAt?.toDate 
                      ? order.createdAt.toDate().toLocaleString() 
                      : new Date(order.createdAt || Date.now()).toLocaleString()
                    }
                  </small>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function OrderMetric({ icon: Icon, label, value, tone }) {
  return (
    <motion.article className={`order-metric glass-panel ${tone}`} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <span className="order-metric-icon"><Icon size={19} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </motion.article>
  );
}

function FilterInput({ icon: Icon, label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="order-filter-control">
      <span><Icon size={14} /> {label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function FilterSelect({ icon: Icon, label, value, onChange, children }) {
  return (
    <label className="order-filter-control">
      <span><Icon size={14} /> {label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function PaymentBadge({ status }) {
  return <span className={`payment-badge ${status}`}>{(status || 'unpaid').replace(/_/g, ' ')}</span>;
}

function DeliveryProgress({ status }) {
  const normalized = status === 'out_for_delivery' ? 'on_the_way' : status;
  const current = DELIVERY_STEPS.indexOf(normalized);
  return (
    <div className="delivery-mini-progress" aria-label="Delivery progress">
      {DELIVERY_STEPS.map((step, index) => (
        <span key={step} className={current >= 0 && index <= current ? 'active' : ''} title={step.replace(/_/g, ' ')} />
      ))}
    </div>
  );
}

function OrderEmptyState({ title, message }) {
  return (
    <div className="orders-empty glass-panel">
      <ShoppingBag size={42} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function AssignRiderModal({ order, riders, onlineUsers, orders, onAssign, onClose }) {
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelectedRiderId(''), [order?.id]);

  if (!order) return null;

  const availableRiders = riders.filter((rider) => rider.isAvailable !== false && !['offline', 'inactive', 'busy'].includes(rider.status));
  const selectedRider = availableRiders.find((rider) => rider.id === selectedRiderId) || availableRiders[0];
  const activeOrders = (riderId) => orders.filter((item) => getRiderId(item) === riderId && !['delivered', 'cancelled'].includes(getOrderStatus(item))).length;

  const submit = async (event) => {
    event.preventDefault();
    const rider = availableRiders.find((item) => item.id === selectedRiderId);
    if (!rider) return;
    setSaving(true);
    await onAssign(order, rider);
    setSaving(false);
  };

  return (
    <AdminModal open title="Assign Rider" onClose={onClose}>
      <form className="assign-rider-modal" onSubmit={submit}>
        <label className="order-filter-control">
          <span><Bike size={14} /> Available rider</span>
          <select value={selectedRiderId} onChange={(event) => setSelectedRiderId(event.target.value)} required>
            <option value="">Select rider</option>
            {availableRiders.map((rider) => (
              <option key={rider.id} value={rider.id}>{rider.name || rider.email} - {activeOrders(rider.id)} active</option>
            ))}
          </select>
        </label>

        {selectedRider ? (
          <div className="rider-capacity-card">
            <div>
              <strong>{selectedRider.name || 'Rider'}</strong>
              <small>{selectedRider.phone || 'No phone'} • {selectedRider.vehicleType || 'Vehicle not set'}</small>
            </div>
            <dl>
              <span><dt>Availability</dt><dd>{onlineUsers[selectedRider.id] ? 'Online' : 'Available'}</dd></span>
              <span><dt>Current Orders</dt><dd>{activeOrders(selectedRider.id)}</dd></span>
              <span><dt>Estimated Distance</dt><dd>{selectedRider.estimatedDistance || '2.4 km'}</dd></span>
              <span><dt>Delivery Capacity</dt><dd>{Math.max(0, Number(selectedRider.deliveryCapacity || 3) - activeOrders(selectedRider.id))} slots</dd></span>
              <span><dt>Current Location</dt><dd>{selectedRider.currentLocation?.address || selectedRider.currentLocation || 'Live location pending'}</dd></span>
            </dl>
          </div>
        ) : (
          <p className="form-help">No available riders found.</p>
        )}

        <div className="admin-form-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="admin-primary-btn" disabled={saving || !selectedRiderId}>
            <Bike size={15} /> {saving ? 'Assigning...' : 'Assign Rider'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function OrderStatusModal({ order, onUpdate, onClose }) {
  const [status, setStatus] = useState(order?.status || 'pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => setStatus(order?.status || 'pending'), [order?.id, order?.status]);
  if (!order) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const ok = await onUpdate(order.id, status);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <AdminModal open title="Update Order Status" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={saving}>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <div className="admin-form-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="admin-primary-btn" disabled={saving}><Save size={15} /> Save Status</button>
        </div>
      </form>
    </AdminModal>
  );
}

function OrderDetailsModal({ order, users, onAssign, onClose }) {
  if (!order) return null;
  const subtotal = Number(order.subtotal ?? (order.items || []).reduce((sum, item) => sum + itemTotal(item), 0));
  const deliveryFee = Number(order.deliveryFee || 0);
  const riderName = getRiderName(order, users);
  const customer = getCustomerInfo(order, users);
  const timeline = order.statusHistory || [{ status: order.status || 'pending', at: order.createdAt }];

  return (
    <AdminModal open title="Order Details" onClose={onClose}>
      <div className="order-detail-modal">
        <div className="detail-modal-grid">
          <section>
            <h4>Customer info</h4>
            <p>{customer.name}</p>
            <small>{customer.phone || 'No phone'} - {customer.email || 'No email'}</small>
            <small>{customer.address || 'No address'}</small>
          </section>
          <section>
            <h4>Payment details</h4>
            <p>{peso(order.total)}</p>
            <PaymentBadge status={order.paymentStatus || 'unpaid'} />
            <small>{(order.paymentProvider || order.paymentMethod || 'Payment method pending').replace(/_/g, ' ')}</small>
          </section>
          <section>
            <h4>Assigned rider</h4>
            <p>{riderName || 'Unassigned'}</p>
            <button type="button" className="inline-action" onClick={onAssign}><Bike size={14} /> Assign rider</button>
          </section>
        </div>

        <section className="detail-products">
          <h4>Products ordered</h4>
          {(order.items || []).map((item, index) => (
            <div key={`${item.product || item.name}-${index}`} className="detail-product-row">
              <span>{item.name || item.product}</span>
              <small>Qty {item.quantity || 1}</small>
              <strong>{peso(itemTotal(item))}</strong>
            </div>
          ))}
        </section>

        <section className="detail-totals">
          <span><small>Subtotal</small><strong>{peso(subtotal)}</strong></span>
          <span><small>Delivery fee</small><strong>{peso(deliveryFee)}</strong></span>
          <span><small>Total</small><strong>{peso(order.total)}</strong></span>
        </section>

        <section className="rider-tracking-panel">
          <h4><Route size={15} /> Rider tracking</h4>
          <p>{order.riderLocation?.address || order.currentLocation || 'Location updates will appear when the rider starts delivery.'}</p>
          <small>ETA: {order.eta || order.estimatedDelivery || 'Calculating from live updates'}</small>
          <DeliveryProgress status={order.deliveryStatus || order.status} />
        </section>

        <section className="detail-timeline">
          <h4>Timeline activity</h4>
          {timeline.map((entry, index) => (
            <div key={`${entry.status}-${index}`}>
              <span>{(entry.status || 'update').replace(/_/g, ' ')}</span>
              <small>{formatDateTime(entry.at)}</small>
            </div>
          ))}
        </section>

        {order.notes && <section><h4>Order notes</h4><p>{order.notes}</p></section>}
      </div>
    </AdminModal>
  );
}

function ProductsPage({ products, categories }) {
  const { user, addToast, setProducts, rememberProductImage } = useMotoBookStore();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => products
    .filter((product) => {
      const term = search.trim().toLowerCase();
      const productCategory = typeof product.category === 'object' ? product.category.id : product.category;
      const lowStock = Number(product.stockQuantity || 0) <= Number(product.lowStockThreshold || 0);
      const outOfStock = Number(product.stockQuantity || 0) <= 0;
      const text = [product.name, product.description, typeof product.category === 'object' ? product.category.name : product.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (!selectedCategory || productCategory === selectedCategory)
        && (!term || text.includes(term))
        && (availabilityFilter === 'all'
          || (availabilityFilter === 'available' && product.isActive !== false && !outOfStock)
          || (availabilityFilter === 'hidden' && product.isActive === false)
          || (availabilityFilter === 'low' && lowStock && !outOfStock)
          || (availabilityFilter === 'out' && outOfStock));
    })
    .sort((a, b) => {
      if (sortBy === 'priceHigh') return Number(b.price || 0) - Number(a.price || 0);
      if (sortBy === 'priceLow') return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === 'stock') return Number(b.stockQuantity || 0) - Number(a.stockQuantity || 0);
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      return (asDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (asDate(a.updatedAt || a.createdAt)?.getTime() || 0);
    }), [products, search, selectedCategory, availabilityFilter, sortBy]);

  const openCreate = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const closeForm = () => {
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const saveProduct = async (form) => {
    setSaving(true);
    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('description', form.description.trim());
      body.append('price', form.price);
      body.append('category', form.category);
      body.append('stockQuantity', form.stockQuantity);
      body.append('lowStockThreshold', form.lowStockThreshold || '10');
      body.append('isActive', String(form.isActive));
      body.append('image', form.image.trim());
      body.append('prepTime', form.prepTime || '');
      body.append('tags', form.tags || '');
      body.append('discountPrice', form.discountPrice || '');
      body.append('isPopular', String(form.isPopular));
      if (form.imageFile) body.append('imageFile', form.imageFile);

      const data = await request(editingProduct ? `/products/${editingProduct.id}` : '/products', {
        token: user?.token,
        method: editingProduct ? 'PUT' : 'POST',
        body,
      });

      if (data?.product) {
        rememberProductImage(data.product.id, data.product.image);
        setProducts(editingProduct
          ? products.map((product) => (product.id === data.product.id ? data.product : product))
          : [data.product, ...products]);
      }

      addToast(editingProduct ? 'Product updated' : 'Product created', 'success');
      closeForm();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await request(`/products/${product.id}`, {
        token: user?.token,
        method: 'DELETE',
      });
      addToast('Product deleted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const toggleAvailability = async (product) => {
    try {
      await request(`/products/${product.id}`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({ isActive: product.isActive === false }),
      });
      addToast(`${product.name || 'Product'} ${product.isActive === false ? 'shown' : 'hidden'}`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <section className="admin-page products-page">
      <div className="page-header admin-page-header products-hero">
        <div>
          <h2><ShoppingBag size={24} /> Products</h2>
          <p>Manage menu items, pricing, stock, images, and availability.</p>
        </div>
        <button className="admin-primary-btn" type="button" onClick={openCreate}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="products-toolbar glass-panel">
        <label className="product-search-control">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." />
        </label>
        <label className="product-select-control">
          <span>Category</span>
          <select value={selectedCategory || ''} onChange={(event) => setSelectedCategory(event.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="product-select-control">
          <span>Availability</span>
          <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            <option value="all">All products</option>
            <option value="available">Available</option>
            <option value="hidden">Hidden</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label className="product-select-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="latest">Recently updated</option>
            <option value="name">Name A-Z</option>
            <option value="priceHigh">Price high-low</option>
            <option value="priceLow">Price low-high</option>
            <option value="stock">Most stock</option>
          </select>
        </label>
        <span className="product-toolbar-count">{filteredProducts.length} shown</span>
      </div>

      {!filteredProducts || filteredProducts.length === 0 ? (
        <div className="glass-panel empty-state">
          <ShoppingBag size={40} />
          <p>{selectedCategory ? 'No products in this category' : 'No products yet'}</p>
          <small>{selectedCategory ? 'Try selecting another category' : 'Products will appear here'}</small>
        </div>
      ) : (
        <div className="products-container">
          <div className="products-count-header">
            <p>
              Showing <strong>{filteredProducts.length}</strong> product{filteredProducts.length !== 1 ? 's' : ''}
              {selectedCategory && ' in selected category'}
            </p>
          </div>
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id} 
                className="product-card glass-panel"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ProductCardImage product={product} />
                <div className="product-info">
                  <div className="admin-card-title-row">
                    <strong className="product-name">{product.name || 'Unnamed Product'}</strong>
                    {product.isActive === false && <span className="admin-status-pill inactive">Inactive</span>}
                  </div>
                  {product.description && <p className="product-description">{product.description}</p>}
                  <div className="product-meta">
                    <span className="product-price">₱{Number(product.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span className={`product-stock ${Number(product.stockQuantity || 0) <= Number(product.lowStockThreshold || 0) ? 'low' : ''}`}>
                      Stock: {product.stockQuantity || 0}
                    </span>
                  </div>
                  <div className="product-category">
                    {product.category && (
                      <small>
                        Category: {typeof product.category === 'object' ? product.category.name : product.category}
                      </small>
                    )}
                  </div>
                  <div className="product-card-actions">
                    <button type="button" onClick={() => addToast(`${product.name || 'Product'} preview opened`, 'info')} aria-label="View product" data-tooltip="View"><Eye size={15} /></button>
                    <button type="button" onClick={() => openEdit(product)} aria-label="Edit product" data-tooltip="Edit"><Pencil size={15} /></button>
                    <button type="button" onClick={() => toggleAvailability(product)} aria-label="Toggle product availability" data-tooltip={product.isActive === false ? 'Show' : 'Hide'}><Power size={15} /></button>
                    <button type="button" className="danger" onClick={() => deleteProduct(product)} aria-label="Delete product" data-tooltip="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AdminModal open={showProductForm} title={editingProduct ? 'Edit Product' : 'Add Product'} modalClassName="product-modal" onClose={closeForm}>
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSubmit={saveProduct}
          onCancel={closeForm}
          saving={saving}
        />
      </AdminModal>
    </section>
  );
}

function ProductCardImage({ product }) {
  const [failed, setFailed] = useState(false);
  const src = product.image && !failed ? imageUrl(product.image) : '';
  const outOfStock = Number(product.stockQuantity || 0) <= 0;
  const lowStock = !outOfStock && Number(product.stockQuantity || 0) <= Number(product.lowStockThreshold || 0);
  const status = product.isActive === false ? 'Hidden' : outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'Available';
  const statusClass = product.isActive === false ? 'hidden' : outOfStock ? 'out' : lowStock ? 'low' : 'available';

  useEffect(() => {
    setFailed(false);
  }, [product.image]);

  return (
    <div className="product-image-shell">
      {src ? (
        <img src={src} alt={product.name || 'Product'} className="product-image" onError={() => setFailed(true)} />
      ) : (
        <div className="product-image product-image-placeholder">
          <ShoppingBag size={32} />
          <span>Product Image</span>
        </div>
      )}
      <span className={`product-image-badge ${statusClass}`}>{status}</span>
      {product.isPopular && <span className="product-popular-badge"><Star size={12} /> Bestseller</span>}
    </div>
  );
}

function CategoriesPage({ categories = [], products = [] }) {
  const { user, addToast } = useMotoBookStore();
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const getCategoryCount = (categoryId) => products.filter((product) => {
    const productCategory = typeof product.category === 'object' ? product.category.id : product.category;
    return productCategory === categoryId;
  }).length;

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((category) => {
        const active = category.isActive !== false;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? active : !active);
        const matchesText = !term || `${category.name || ''} ${category.description || ''}`.toLowerCase().includes(term);
        return matchesStatus && matchesText;
      })
      .sort((a, b) => {
        if (sortBy === 'items') return getCategoryCount(b.id) - getCategoryCount(a.id);
        if (sortBy === 'status') return Number(b.isActive !== false) - Number(a.isActive !== false);
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [categories, products, search, statusFilter, sortBy]);

  const openCreate = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const closeForm = () => {
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const saveCategory = async (form) => {
    setSaving(true);
    try {
      await request(editingCategory ? `/categories/${editingCategory.id}` : '/categories', {
        token: user?.token,
        method: editingCategory ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          image: form.image,
          isActive: form.isActive,
        }),
      });

      addToast(editingCategory ? 'Category updated' : 'Category created', 'success');
      closeForm();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete ${category.name}? Products in this category may need reassignment.`)) return;
    try {
      await request(`/categories/${category.id}`, {
        token: user?.token,
        method: 'DELETE',
      });
      addToast('Category deleted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <section className="admin-page categories-page">
      <div className="page-header admin-page-header categories-hero">
        <div>
          <h2><FolderTree size={24} /> Categories</h2>
          <p>Manage visual menu groups, availability, and item organization.</p>
        </div>
        <button className="admin-primary-btn" type="button" onClick={openCreate}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="categories-toolbar glass-panel">
        <label className="category-search-control">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories..." />
        </label>
        <label className="category-select-control">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="category-select-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name A-Z</option>
            <option value="items">Most items</option>
            <option value="status">Active first</option>
          </select>
        </label>
        <span className="category-toolbar-count">{filteredCategories.length} shown</span>
      </div>

      {!categories.length ? (
        <div className="glass-panel empty-state">
          <FolderTree size={40} />
          <p>No categories yet</p>
          <small>Create visual categories for menu browsing and admin organization.</small>
        </div>
      ) : !filteredCategories.length ? (
        <div className="glass-panel empty-state">
          <Search size={40} />
          <p>No matching categories</p>
          <small>Adjust search, filter, or sort controls.</small>
        </div>
      ) : (
        <div className="categories-container">
          <div className="categories-grid">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                itemCount={getCategoryCount(category.id)}
                onEdit={() => openEdit(category)}
                onDelete={() => deleteCategory(category)}
                onView={() => addToast(`${category.name || 'Category'} has ${getCategoryCount(category.id)} item${getCategoryCount(category.id) === 1 ? '' : 's'}`, 'info')}
              />
            ))}
          </div>
        </div>
      )}

      <AdminModal open={showCategoryForm} title={editingCategory ? 'Edit Category' : 'Add Category'} modalClassName="category-modal" onClose={closeForm}>
        <CategoryForm
          category={editingCategory}
          onSubmit={saveCategory}
          onCancel={closeForm}
          saving={saving}
        />
      </AdminModal>
    </section>
  );
}

function CategoryCard({ category, itemCount, onEdit, onDelete, onView }) {
  const active = category.isActive !== false;
  const [failed, setFailed] = useState(false);
  const src = category.image && !failed ? imageUrl(category.image) : '';

  useEffect(() => {
    setFailed(false);
  }, [category.image]);

  return (
    <motion.article
      className="category-card glass-panel"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <div className="category-image-wrap">
        {src ? (
          <img src={src} alt={category.name || 'Category'} className="category-image" onError={() => setFailed(true)} />
        ) : (
          <div className="category-image category-image-placeholder">
            <FolderTree size={30} />
            <span>MotoBook</span>
          </div>
        )}
        <span className={`category-status-badge ${active ? 'active' : 'inactive'}`}>{active ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="category-info">
        <div>
          <strong className="category-name">{category.name || 'Unnamed Category'}</strong>
          <p className="category-description">{category.description || 'No description added yet.'}</p>
        </div>
        <div className="category-meta-row">
          <span><Package size={14} /> {itemCount} item{itemCount === 1 ? '' : 's'}</span>
          <small>{active ? 'Visible to customers' : 'Hidden from menu'}</small>
        </div>
        <div className="category-actions">
          <button type="button" onClick={onView} aria-label="View category items" data-tooltip="View Items"><Eye size={15} /></button>
          <button type="button" onClick={onEdit} aria-label="Edit category" data-tooltip="Edit"><Pencil size={15} /></button>
          <button type="button" className="danger" onClick={onDelete} aria-label="Delete category" data-tooltip="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    </motion.article>
  );
}

function CustomersPage({ users = [], orders = [] }) {
  const { user, addToast, loading } = useMotoBookStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const pageSize = 10;

  const enrichedUsers = useMemo(() => users.map((item) => {
    const userOrders = orders.filter((order) => {
      const customerId = typeof order.customer === 'string' ? order.customer : order.customer?.id || order.customerId;
      const riderId = getRiderId(order);
      return customerId === item.id || riderId === item.id;
    });
    const completed = userOrders.filter((order) => order.status === 'delivered' || order.deliveryStatus === 'delivered');
    return {
      ...item,
      displayName: item.fullname || item.name || item.email?.split('@')[0] || 'User',
      accountStatus: item.status || (item.isActive === false ? 'inactive' : 'active'),
      computedOrders: Number(item.totalOrders ?? completed.length),
      computedSpent: Number(item.totalSpent ?? completed.reduce((sum, order) => sum + Number(order.total || 0), 0)),
    };
  }), [users, orders]);

  const stats = useMemo(() => ({
    total: enrichedUsers.length,
    active: enrichedUsers.filter((item) => item.accountStatus === 'active' && item.isActive !== false).length,
    riders: enrichedUsers.filter((item) => item.role === 'rider').length,
    customers: enrichedUsers.filter((item) => item.role === 'customer').length,
  }), [enrichedUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enrichedUsers
      .filter((item) => {
        const text = [item.displayName, item.email, item.phone, item.address, item.role, item.accountStatus].filter(Boolean).join(' ').toLowerCase();
        return (!term || text.includes(term))
          && (filter === 'all'
            || item.role === filter
            || (filter === 'active' && item.accountStatus === 'active' && item.isActive !== false)
            || (filter === 'inactive' && (item.accountStatus === 'inactive' || item.isActive === false)));
      })
      .sort((a, b) => {
        const left = sortValue(a, sort.key);
        const right = sortValue(b, sort.key);
        if (left < right) return sort.direction === 'asc' ? -1 : 1;
        if (left > right) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [enrichedUsers, filter, search, sort]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const selectedUsers = enrichedUsers.filter((item) => selectedIds.includes(item.id));

  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));

  const toggleSelected = (id) => setSelectedIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ));

  const togglePageSelected = () => {
    const pageIds = pageUsers.map((item) => item.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !pageIds.includes(id))
      : Array.from(new Set([...current, ...pageIds])));
  };

  const exportUsers = () => exportRows('motobook-users.csv', filteredUsers.map((item) => ({
    name: item.displayName,
    email: item.email,
    phone: item.phone || '',
    role: item.role || '',
    status: item.accountStatus,
    createdAt: asDate(item.createdAt)?.toISOString() || '',
    lastLogin: asDate(item.lastLogin || item.lastLoginAt || item.lastSeen)?.toISOString() || '',
    ordersCompleted: item.computedOrders,
    totalSpent: item.computedSpent,
  })));

  const saveUser = async (form, target = null) => {
    try {
      await request(target ? `/users/${target.id}` : '/users', {
        token: user?.token,
        method: target ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      addToast(target ? 'User updated' : 'User created', 'success');
      setEditingUser(null);
      setShowCreate(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const setUserStatus = async (target, status) => {
    try {
      await request(`/users/${target.id}/status`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      addToast(`${target.displayName} marked ${status}`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const updateUserRole = async (target, role) => {
    try {
      await request(`/users/${target.id}/role`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      addToast(`${target.displayName} moved to ${role}`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const deleteUser = async (target) => {
    if (!window.confirm(`Delete ${target.displayName}? This cannot be undone.`)) return;
    try {
      await request(`/users/${target.id}`, { token: user?.token, method: 'DELETE' });
      addToast('User deleted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const resetPassword = async (target) => {
    try {
      const data = await request(`/users/${target.id}/reset-password`, { token: user?.token, method: 'POST' });
      await navigator.clipboard?.writeText(data.resetLink);
      addToast('Password reset link generated and copied', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const bulkStatus = async (status) => {
    await Promise.all(selectedUsers.map((item) => setUserStatus(item, status)));
    setSelectedIds([]);
  };

  return (
    <section className="admin-page users-management-page">
      <div className="users-management-header">
        <div>
          <span className="eyebrow">Identity and access</span>
          <h2><Users size={24} /> Users Management</h2>
          <p>Manage customers, riders, and administrators</p>
        </div>
        <div className="users-header-actions">
          <button type="button" className="admin-primary-btn" onClick={() => setShowCreate(true)}><Plus size={16} /> Add User</button>
          <button type="button" className="secondary-action" onClick={exportUsers}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      <div className="users-toolbar glass-panel">
        <label className="users-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users instantly" />
        </label>
        <label className="users-filter">
          <Filter size={15} />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All Users</option>
            <option value="customer">Customers</option>
            <option value="rider">Riders</option>
            <option value="admin">Admin</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="users-stat-grid">
        <UserStatCard icon={Users} label="Total Users" value={stats.total} trend="+12%" tone="cyan" />
        <UserStatCard icon={UserCheck} label="Active Users" value={stats.active} trend={`${percentage(stats.active, stats.total)} active`} tone="green" />
        <UserStatCard icon={Bike} label="Riders" value={stats.riders} trend="+ dispatch" tone="blue" />
        <UserStatCard icon={ShoppingBag} label="Customers" value={stats.customers} trend="+ orders" tone="purple" />
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-actions glass-panel">
          <span>{selectedIds.length} selected</span>
          <button type="button" onClick={() => bulkStatus('active')}><UserCheck size={14} /> Activate</button>
          <button type="button" onClick={() => bulkStatus('inactive')}><UserX size={14} /> Disable</button>
          <button type="button" onClick={() => bulkStatus('suspended')} className="danger"><Ban size={14} /> Suspend</button>
        </div>
      )}

      {loading ? (
        <UsersSkeleton />
      ) : filteredUsers.length === 0 ? (
        <UsersEmptyState onAdd={() => setShowCreate(true)} />
      ) : (
        <>
          <div className="users-table-shell glass-panel">
            <table className="users-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={pageUsers.length > 0 && pageUsers.every((item) => selectedIds.includes(item.id))} onChange={togglePageSelected} aria-label="Select page users" /></th>
                  <SortableTh label="Profile Avatar" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Email" sortKey="email" sort={sort} onSort={toggleSort} />
                  <th>Phone Number</th>
                  <SortableTh label="Role" sortKey="role" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Registration Date" sortKey="createdAt" sort={sort} onSort={toggleSort} />
                  <th>Last Login</th>
                  <SortableTh label="Orders Completed" sortKey="orders" sort={sort} onSort={toggleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((item) => (
                  <UserTableRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.includes(item.id)}
                    onSelect={() => toggleSelected(item.id)}
                    onView={() => setViewUser(item)}
                    onEdit={() => setEditingUser(item)}
                    onDisable={() => setUserStatus(item, item.accountStatus === 'active' ? 'inactive' : 'active')}
                    onDelete={() => deleteUser(item)}
                    onRiderAccess={() => updateUserRole(item, 'rider')}
                    onReset={() => resetPassword(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="users-mobile-list">
            {pageUsers.map((item) => (
              <UserMobileCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onSelect={() => toggleSelected(item.id)}
                onView={() => setViewUser(item)}
                onEdit={() => setEditingUser(item)}
                onDisable={() => setUserStatus(item, item.accountStatus === 'active' ? 'inactive' : 'active')}
                onDelete={() => deleteUser(item)}
                onRiderAccess={() => updateUserRole(item, 'rider')}
                onReset={() => resetPassword(item)}
              />
            ))}
          </div>

          <div className="orders-pagination glass-panel">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </>
      )}

      <AdminModal open={showCreate} title="Create User" onClose={() => setShowCreate(false)}>
        <UserForm onSubmit={(form) => saveUser(form)} onCancel={() => setShowCreate(false)} />
      </AdminModal>
      <AdminModal open={!!editingUser} title="Edit User" onClose={() => setEditingUser(null)}>
        <UserForm user={editingUser} onSubmit={(form) => saveUser(form, editingUser)} onCancel={() => setEditingUser(null)} />
      </AdminModal>
      <UserDetailsModal user={viewUser} orders={orders} onClose={() => setViewUser(null)} />
    </section>
  );
}

function sortValue(item, key) {
  if (key === 'createdAt') return asDate(item.createdAt)?.getTime() || 0;
  if (key === 'orders') return item.computedOrders || 0;
  if (key === 'status') return item.accountStatus || '';
  if (key === 'name') return item.displayName || '';
  return item[key] || '';
}

function percentage(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function getUserInitials(item) {
  const name = item?.displayName || item?.name || item?.fullname || item?.email || '?';
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function UserStatCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <motion.article className={`user-stat-card glass-panel ${tone}`} whileHover={{ y: -3 }}>
      <span><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{trend}</em>
      </div>
    </motion.article>
  );
}

function SortableTh({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th>
      <button type="button" className={active ? 'active-sort' : ''} onClick={() => onSort(sortKey)}>
        {label} {active ? (sort.direction === 'asc' ? '^' : 'v') : ''}
      </button>
    </th>
  );
}

function UserAvatar({ item, large = false }) {
  const src = item.avatar || item.photoURL;
  return src ? (
    <img className={large ? 'managed-user-avatar large' : 'managed-user-avatar'} src={src} alt="" />
  ) : (
    <span className={large ? 'managed-user-avatar large fallback' : 'managed-user-avatar fallback'}>{getUserInitials(item)}</span>
  );
}

function RoleBadge({ role }) {
  return <span className={`role-badge ${role || 'customer'}`}>{role || 'customer'}</span>;
}

function AccountStatusBadge({ status }) {
  return <span className={`account-status-badge ${status || 'active'}`}>{status || 'active'}</span>;
}

function UserTableRow({ item, selected, onSelect, onView, onEdit, onDisable, onDelete, onRiderAccess, onReset }) {
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <td><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${item.displayName}`} /></td>
      <td>
        <div className="user-identity-cell">
          <UserAvatar item={item} />
          <div>
            <strong>{item.displayName}</strong>
            <small>{item.address || 'No address'}</small>
          </div>
        </div>
      </td>
      <td>{item.email || 'N/A'}</td>
      <td>{item.phone || 'N/A'}</td>
      <td><RoleBadge role={item.role} /></td>
      <td><AccountStatusBadge status={item.accountStatus} /></td>
      <td>{formatDateTime(item.createdAt)}</td>
      <td>{formatDateTime(item.lastLogin || item.lastLoginAt || item.lastSeen)}</td>
      <td>{item.computedOrders}</td>
      <td>
        <UserActionGroup
          item={item}
          onView={onView}
          onEdit={onEdit}
          onDisable={onDisable}
          onDelete={onDelete}
          onRiderAccess={onRiderAccess}
          onReset={onReset}
        />
      </td>
    </motion.tr>
  );
}

function UserActionGroup({ item, onView, onEdit, onDisable, onDelete, onRiderAccess, onReset }) {
  const riderAccessLabel = item.role === 'rider' ? 'Already Rider' : 'Make Rider';
  return (
    <div className="user-actions">
      <button type="button" onClick={onView} title="View User" aria-label="View User"><Eye size={14} /></button>
      <button type="button" onClick={onEdit} title="Edit User" aria-label="Edit User"><Pencil size={14} /></button>
      <button type="button" onClick={onDisable} title="Disable User" aria-label="Disable User">{item.accountStatus === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}</button>
      <button type="button" onClick={onRiderAccess} title={riderAccessLabel} aria-label={riderAccessLabel} disabled={item.role === 'rider'}><Bike size={14} /></button>
      <button type="button" onClick={onReset} title="Reset Password" aria-label="Reset Password"><LockKeyhole size={14} /></button>
      <button type="button" className="danger" onClick={onDelete} title="Delete User" aria-label="Delete User"><Trash2 size={14} /></button>
    </div>
  );
}

function UserMobileCard({ item, selected, onSelect, onView, onEdit, onDisable, onDelete, onRiderAccess, onReset }) {
  return (
    <motion.article className="user-mobile-card glass-panel" whileHover={{ y: -2 }}>
      <div className="mobile-user-top">
        <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${item.displayName}`} />
        <UserAvatar item={item} />
        <div>
          <strong>{item.displayName}</strong>
          <small>{item.email}</small>
        </div>
        <MoreHorizontal size={17} />
      </div>
      <div className="mobile-user-meta">
        <span><Phone size={13} /> {item.phone || 'N/A'}</span>
        <RoleBadge role={item.role} />
        <AccountStatusBadge status={item.accountStatus} />
        <span>{item.computedOrders} orders</span>
      </div>
      <UserActionGroup item={item} onView={onView} onEdit={onEdit} onDisable={onDisable} onDelete={onDelete} onRiderAccess={onRiderAccess} onReset={onReset} />
    </motion.article>
  );
}

function UsersSkeleton() {
  return (
    <div className="users-skeleton glass-panel">
      {Array.from({ length: 7 }).map((_, index) => <span key={index} />)}
    </div>
  );
}

function UsersEmptyState({ onAdd }) {
  return (
    <div className="users-empty glass-panel">
      <Users size={44} />
      <h3>No users found</h3>
      <p>Create your first account or adjust the current filters.</p>
      <button type="button" className="admin-primary-btn" onClick={onAdd}><Plus size={16} /> Add User</button>
    </div>
  );
}

function UserForm({ user, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: user?.displayName || user?.name || user?.fullname || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'customer',
    phone: user?.phone || '',
    address: user?.address || '',
    avatar: user?.avatar || user?.photoURL || '',
    status: user?.accountStatus || user?.status || (user?.isActive === false ? 'inactive' : 'active'),
  });
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('avatar', reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (user) {
      delete payload.email;
      if (!payload.password) delete payload.password;
    }
    await onSubmit(payload);
    setSaving(false);
  };

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-avatar">
        <UserAvatar item={{ ...form, displayName: form.name }} large />
        <label>
          <Upload size={15} /> Upload Profile Image
          <input type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} disabled={saving} />
        </label>
      </div>
      <div className="admin-form-grid">
        <label>Name <input value={form.name} onChange={(event) => update('name', event.target.value)} required disabled={saving} /></label>
        <label>Email <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required disabled={saving || !!user} /></label>
      </div>
      {!user && <label>Password <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={6} disabled={saving} /></label>}
      <div className="admin-form-grid">
        <label>Role Selection
          <select value={form.role} onChange={(event) => update('role', event.target.value)} disabled={saving}>
            <option value="customer">Customer</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>Account Status
          <select value={form.status} onChange={(event) => update('status', event.target.value)} disabled={saving}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
      </div>
      <div className="admin-form-grid">
        <label>Contact Number <input value={form.phone} onChange={(event) => update('phone', event.target.value)} disabled={saving} /></label>
        <label>Avatar URL <input value={form.avatar} onChange={(event) => update('avatar', event.target.value)} disabled={saving} /></label>
      </div>
      <label>Address <textarea value={form.address} onChange={(event) => update('address', event.target.value)} disabled={saving} /></label>
      <div className="role-permissions">
        <strong><Shield size={15} /> Role Permissions</strong>
        <span>Admin: Full system access</span>
        <span>Rider: Delivery management, assigned orders, delivery tracking</span>
        <span>Customer: Orders, payments, account management</span>
      </div>
      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="admin-primary-btn" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save User'}</button>
      </div>
    </form>
  );
}

function UserDetailsModal({ user, orders, onClose }) {
  if (!user) return null;
  const visiblePassword = user.plainPassword || user.temporaryPassword || user.initialPassword || user.generatedPassword || '';
  const relatedOrders = orders.filter((order) => {
    const customerId = typeof order.customer === 'string' ? order.customer : order.customer?.id || order.customerId;
    const riderId = getRiderId(order);
    return customerId === user.id || riderId === user.id;
  });
  const delivered = relatedOrders.filter((order) => order.status === 'delivered' || order.deliveryStatus === 'delivered');
  const timeline = [
    { label: 'Registered', at: user.createdAt },
    { label: 'Last login', at: user.lastLogin || user.lastLoginAt || user.lastSeen },
    { label: 'Profile updated', at: user.updatedAt },
  ].filter((item) => item.at);

  return (
    <AdminModal open title="User Details" onClose={onClose}>
      <div className="user-detail-modal">
        <div className="user-detail-hero">
          <UserAvatar item={user} large />
          <div>
            <h3>{user.displayName}</h3>
            <p><Mail size={14} /> {user.email}</p>
            <p><Phone size={14} /> {user.phone || 'No contact number'}</p>
          </div>
          <div className="user-detail-badges">
            <RoleBadge role={user.role} />
            <AccountStatusBadge status={user.accountStatus} />
          </div>
        </div>
        <div className="user-detail-grid">
          <section><small>Address</small><strong>{user.address || 'No address'}</strong></section>
          <section><small>Total Orders</small><strong>{user.computedOrders}</strong></section>
          <section><small>Total Spending</small><strong>{peso(user.computedSpent)}</strong></section>
          <section><small>Registration Date</small><strong>{formatDateTime(user.createdAt)}</strong></section>
          <section><small>Last Login</small><strong>{formatDateTime(user.lastLogin || user.lastLoginAt || user.lastSeen)}</strong></section>
          <section><small>Delivery History</small><strong>{delivered.length} completed</strong></section>
          <section className="user-password-card">
            <small>Password</small>
            <strong>{visiblePassword || 'Not available'}</strong>
            {!visiblePassword && <span>Use reset password to create a new one.</span>}
          </section>
        </div>
        <section className="detail-timeline">
          <h4>Activity Timeline</h4>
          {timeline.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <small>{formatDateTime(item.at)}</small>
            </div>
          ))}
          {!timeline.length && <p className="form-help">No activity yet.</p>}
        </section>
      </div>
    </AdminModal>
  );
}

function RidersPage({ users = [], orders = [], onlineUsers = {} }) {
  const { user, addToast, loading } = useMotoBookStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [detailRider, setDetailRider] = useState(null);
  const [editingRider, setEditingRider] = useState(null);
  const [assignRiderTarget, setAssignRiderTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const pageSize = 8;

  const enrichedRiders = useMemo(() => users
    .filter((item) => item.role === 'rider')
    .map((item) => {
      const riderOrders = orders.filter((order) => getRiderId(order) === item.id);
      const activeOrders = riderOrders.filter((order) => !['delivered', 'cancelled'].includes(getOrderStatus(order)));
      const delivering = riderOrders.some((order) => ['assigned', 'accepted', 'picked_up', 'on_the_way', 'out_for_delivery', 'arrived'].includes(getOrderStatus(order)));
      const completed = riderOrders.filter((order) => getOrderStatus(order) === 'delivered' || order.status === 'delivered');
      const today = new Date().toDateString();
      const todayDelivered = completed.filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt) || new Date(0)).toDateString() === today);
      const isDisabled = item.isActive === false || item.status === 'disabled' || item.status === 'inactive' || item.status === 'suspended';
      const liveStatus = isDisabled ? 'disabled' : delivering ? 'delivering' : item.isAvailable === false ? 'offline' : (onlineUsers[item.id] || item.isAvailable === true) ? 'available' : 'offline';
      return {
        ...item,
        displayName: item.fullname || item.name || item.email?.split('@')[0] || 'Rider',
        liveStatus,
        isOnline: !!onlineUsers[item.id],
        riderOrders,
        activeOrders,
        completedDeliveries: Number(item.completedDeliveries ?? item.totalDeliveries ?? completed.length),
        assignedOrdersCount: Number(item.currentOrders ?? activeOrders.length),
        todayEarnings: Number(item.todayEarnings ?? todayDelivered.reduce((sum, order) => sum + Number(order.deliveryFee || 49), 0)),
        rating: Number(item.rating || 4.8),
        vehicleType: item.vehicleType || item.vehicle || 'Motorcycle',
        currentLocation: item.location?.address || item.currentLocation?.address || item.currentLocation || item.address || 'Location pending',
        lastOnline: item.lastOnline || item.lastSeen || item.lastLoginAt,
      };
    }), [users, orders, onlineUsers]);

  const stats = useMemo(() => ({
    total: enrichedRiders.length,
    active: enrichedRiders.filter((rider) => rider.liveStatus !== 'disabled').length,
    delivering: enrichedRiders.reduce((sum, rider) => sum + rider.activeOrders.length, 0),
    offline: enrichedRiders.filter((rider) => rider.liveStatus === 'offline').length,
  }), [enrichedRiders]);

  const filteredRiders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enrichedRiders
      .filter((rider) => {
        const text = [rider.displayName, rider.email, rider.phone, rider.vehicleType, rider.currentLocation].filter(Boolean).join(' ').toLowerCase();
        return (!term || text.includes(term))
          && (filter === 'all' || rider.liveStatus === filter);
      })
      .sort((a, b) => {
        if (sort === 'deliveries') return b.completedDeliveries - a.completedDeliveries;
        if (sort === 'online') return statusRank(a.liveStatus) - statusRank(b.liveStatus);
        return (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0);
      });
  }, [enrichedRiders, filter, search, sort]);

  useEffect(() => setPage(1), [search, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRiders.length / pageSize));
  const pageRiders = filteredRiders.slice((page - 1) * pageSize, page * pageSize);
  const assignableOrders = orders.filter((order) => !getRiderId(order) && !['delivered', 'cancelled'].includes(getOrderStatus(order)));

  const saveRider = async (form, target = null) => {
    try {
      const payload = { ...form, role: 'rider' };
      await request(target ? `/users/${target.id}` : '/users', {
        token: user?.token,
        method: target ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      addToast(target ? 'Rider updated' : 'Rider created', 'success');
      setEditingRider(null);
      setShowCreate(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const setRiderStatus = async (rider, status) => {
    try {
      await request(`/users/${rider.id}`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({
          status: status === 'disabled' ? 'inactive' : 'active',
          isAvailable: status === 'available',
        }),
      });
      addToast(`${rider.displayName} updated`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const convertRole = async (rider) => {
    if (!window.confirm(`Convert ${rider.displayName} from rider to customer? This removes rider fleet access.`)) return;
    try {
      await request(`/users/${rider.id}/role`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({ role: 'customer' }),
      });
      addToast(`${rider.displayName} converted to customer`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const deleteRider = async (rider) => {
    if (!window.confirm(`Delete ${rider.displayName}? This cannot be undone.`)) return;
    try {
      await request(`/users/${rider.id}`, { token: user?.token, method: 'DELETE' });
      addToast('Rider deleted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const assignOrder = async (orderId) => {
    if (!assignRiderTarget || !orderId) return;
    try {
      await request(`/orders/${orderId}/assign-rider`, {
        token: user?.token,
        method: 'PUT',
        body: JSON.stringify({ riderId: assignRiderTarget.id }),
      });
      addToast(`Order assigned to ${assignRiderTarget.displayName}`, 'success');
      setAssignRiderTarget(null);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const exportRiders = () => exportRows('motobook-riders.csv', filteredRiders.map((rider) => ({
    name: rider.displayName,
    email: rider.email,
    phone: rider.phone || '',
    status: rider.liveStatus,
    vehicleType: rider.vehicleType,
    completedDeliveries: rider.completedDeliveries,
    assignedOrders: rider.assignedOrdersCount,
    rating: rider.rating,
    todayEarnings: rider.todayEarnings,
    currentLocation: rider.currentLocation,
    lastOnline: asDate(rider.lastOnline)?.toISOString() || '',
  })));

  return (
    <section className="admin-page fleet-page">
      <div className="fleet-header">
        <div>
          <span className="eyebrow">Fleet operations</span>
          <h2><Bike size={24} /> Riders</h2>
          <p>Manage delivery fleet and rider operations</p>
        </div>
        <div className="fleet-header-actions">
          <button type="button" className="admin-primary-btn" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Rider</button>
          <button type="button" className="secondary-action" onClick={exportRiders}><Download size={16} /> Export Riders CSV</button>
        </div>
      </div>

      <div className="fleet-toolbar glass-panel">
        <label className="fleet-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search riders by name, email, phone" />
        </label>
        <label className="fleet-select"><Filter size={15} />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All Riders</option>
            <option value="available">Available</option>
            <option value="delivering">Delivering</option>
            <option value="offline">Offline</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="fleet-select"><SlidersHorizontal size={15} />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="deliveries">Most Deliveries</option>
            <option value="online">Online Status</option>
          </select>
        </label>
      </div>

      <div className="fleet-stat-grid">
        <FleetStatCard icon={Bike} label="Total Riders" value={stats.total} trend="+ fleet" tone="cyan" />
        <FleetStatCard icon={UserCheck} label="Active Riders" value={stats.active} trend={`${percentage(stats.active, stats.total)} active`} tone="green" />
        <FleetStatCard icon={Truck} label="Delivering Orders" value={stats.delivering} trend="+ live queue" tone="purple" />
        <FleetStatCard icon={PowerOff} label="Offline Riders" value={stats.offline} trend="- monitor" tone="blue" />
      </div>

      {loading ? (
        <RiderSkeleton />
      ) : pageRiders.length === 0 ? (
        <RiderEmptyState onAdd={() => setShowCreate(true)} />
      ) : (
        <>
          <div className="fleet-grid">
            <AnimatePresence>
              {pageRiders.map((rider) => (
                <RiderFleetCard
                  key={rider.id}
                  rider={rider}
                  onView={() => setDetailRider(rider)}
                  onEdit={() => setEditingRider(rider)}
                  onAssign={() => setAssignRiderTarget(rider)}
                  onDisable={() => setRiderStatus(rider, rider.liveStatus === 'disabled' ? 'available' : 'disabled')}
                  onToggleOnline={() => setRiderStatus(rider, rider.liveStatus === 'available' ? 'offline' : 'available')}
                  onConvert={() => convertRole(rider)}
                  onDelete={() => deleteRider(rider)}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="orders-pagination glass-panel">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </>
      )}

      <AdminModal open={showCreate} title="Add Rider" onClose={() => setShowCreate(false)}>
        <RiderForm onSubmit={(form) => saveRider(form)} onCancel={() => setShowCreate(false)} />
      </AdminModal>
      <AdminModal open={!!editingRider} title="Edit Rider" onClose={() => setEditingRider(null)}>
        <RiderForm rider={editingRider} onSubmit={(form) => saveRider(form, editingRider)} onCancel={() => setEditingRider(null)} />
      </AdminModal>
      <AssignOrderToRiderModal rider={assignRiderTarget} orders={assignableOrders} onAssign={assignOrder} onClose={() => setAssignRiderTarget(null)} />
      <RiderDetailModal rider={detailRider} orders={orders} onClose={() => setDetailRider(null)} />
    </section>
  );
}

function statusRank(status) {
  return { available: 0, delivering: 1, offline: 2, disabled: 3 }[status] ?? 4;
}

function FleetStatCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <motion.article className={`fleet-stat-card glass-panel ${tone}`} whileHover={{ y: -3 }}>
      <span><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{trend}</em>
      </div>
    </motion.article>
  );
}

function RiderStatusBadge({ status }) {
  return <span className={`fleet-status-badge ${status}`}>{status || 'offline'}</span>;
}

function RiderFleetCard({ rider, onView, onEdit, onAssign, onDisable, onToggleOnline, onConvert, onDelete }) {
  return (
    <motion.article className="fleet-rider-card glass-panel" layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} whileHover={{ y: -4 }}>
      <div className="fleet-rider-top">
        <UserAvatar item={rider} />
        <div>
          <strong>{rider.displayName}</strong>
          <small>{rider.email}</small>
        </div>
        <RiderStatusBadge status={rider.liveStatus} />
      </div>

      <div className="fleet-rider-contact">
        <span><Phone size={14} /> {rider.phone || 'No phone number'}</span>
        <span><Truck size={14} /> {rider.vehicleType}</span>
        <span><MapPinned size={14} /> {rider.currentLocation}</span>
      </div>

      <div className="fleet-rider-metrics">
        <span><small>Total Deliveries</small><strong>{rider.completedDeliveries}</strong></span>
        <span><small>Average Rating</small><strong><Star size={13} /> {rider.rating.toFixed(1)}</strong></span>
        <span><small>Assigned Orders</small><strong>{rider.assignedOrdersCount}</strong></span>
        <span><small>Today's Earnings</small><strong>{peso(rider.todayEarnings)}</strong></span>
      </div>

      <div className="fleet-rider-footer">
        <small><Clock size={13} /> Last online {formatDateTime(rider.lastOnline)}</small>
        <div>
          <button type="button" onClick={onToggleOnline} title="Availability toggle" aria-label="Availability toggle">
            {rider.liveStatus === 'available' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button type="button" onClick={onView}><Eye size={14} /> View</button>
          <button type="button" onClick={onEdit}><Pencil size={14} /> Edit</button>
          <button type="button" onClick={onAssign}><Package size={14} /> Assign</button>
          <button type="button" className="warning" onClick={onConvert}><Users size={14} /> Customer</button>
          <button type="button" className="danger" onClick={onDisable}>{rider.liveStatus === 'disabled' ? <UserCheck size={14} /> : <UserX size={14} />} {rider.liveStatus === 'disabled' ? 'Enable' : 'Disable'}</button>
          <button type="button" className="danger" onClick={onDelete} aria-label="Delete rider"><Trash2 size={14} /></button>
        </div>
      </div>
    </motion.article>
  );
}

function RiderForm({ rider, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: rider?.displayName || rider?.name || '',
    email: rider?.email || '',
    password: '',
    phone: rider?.phone || '',
    address: rider?.address || '',
    avatar: rider?.avatar || rider?.photoURL || '',
    vehicleType: rider?.vehicleType || 'Motorcycle',
    plateNumber: rider?.plateNumber || '',
    status: rider?.liveStatus === 'disabled' ? 'inactive' : 'active',
    isAvailable: rider?.liveStatus !== 'offline' && rider?.liveStatus !== 'disabled',
  });
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, role: 'rider' };
    if (rider) {
      delete payload.email;
      if (!payload.password) delete payload.password;
    }
    await onSubmit(payload);
    setSaving(false);
  };

  return (
    <form className="user-form rider-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label>Name <input value={form.name} onChange={(event) => update('name', event.target.value)} required disabled={saving} /></label>
        <label>Email <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required disabled={saving || !!rider} /></label>
      </div>
      {!rider && <label>Password <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={6} disabled={saving} /></label>}
      <div className="admin-form-grid">
        <label>Phone <input value={form.phone} onChange={(event) => update('phone', event.target.value)} disabled={saving} /></label>
        <label>Vehicle Type
          <select value={form.vehicleType} onChange={(event) => update('vehicleType', event.target.value)} disabled={saving}>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Bicycle">Bicycle</option>
            <option value="Car">Car</option>
          </select>
        </label>
      </div>
      <div className="admin-form-grid">
        <label>Plate Number <input value={form.plateNumber} onChange={(event) => update('plateNumber', event.target.value)} disabled={saving} /></label>
        <label>Profile Image URL <input value={form.avatar} onChange={(event) => update('avatar', event.target.value)} disabled={saving} /></label>
      </div>
      <label>Address <textarea value={form.address} onChange={(event) => update('address', event.target.value)} disabled={saving} /></label>
      <label className="admin-check-row">
        <input type="checkbox" checked={form.isAvailable} onChange={(event) => update('isAvailable', event.target.checked)} disabled={saving} />
        Available for delivery
      </label>
      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="admin-primary-btn" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save Rider'}</button>
      </div>
    </form>
  );
}

function AssignOrderToRiderModal({ rider, orders, onAssign, onClose }) {
  const [orderId, setOrderId] = useState('');
  useEffect(() => setOrderId(''), [rider?.id]);
  if (!rider) return null;

  return (
    <AdminModal open title="Assign Order" onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); onAssign(orderId); }}>
        <label>
          Available orders
          <select value={orderId} onChange={(event) => setOrderId(event.target.value)} required>
            <option value="">Select order</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>{order.orderNumber || order.id} - {order.customer?.name || 'Customer'} - {peso(order.total)}</option>
            ))}
          </select>
        </label>
        {!orders.length && <p className="form-help">No unassigned active orders are available.</p>}
        <div className="admin-form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-primary-btn" disabled={!orderId}><Package size={15} /> Assign to {rider.displayName}</button>
        </div>
      </form>
    </AdminModal>
  );
}

function RiderDetailModal({ rider, orders, onClose }) {
  if (!rider) return null;
  const riderOrders = orders.filter((order) => getRiderId(order) === rider.id);
  const activeOrders = riderOrders.filter((order) => !['delivered', 'cancelled'].includes(getOrderStatus(order)));
  const completed = riderOrders.filter((order) => getOrderStatus(order) === 'delivered' || order.status === 'delivered');
  const avgDeliveryMinutes = completed.length ? Math.round(completed.reduce((sum, order) => {
    const start = asDate(order.createdAt)?.getTime() || 0;
    const end = asDate(order.deliveredAt || order.updatedAt)?.getTime() || start;
    return sum + Math.max(0, end - start) / 60000;
  }, 0) / completed.length) : 0;
  const timeline = [
    { label: 'Rider created', at: rider.createdAt },
    { label: 'Last online', at: rider.lastOnline },
    { label: 'Profile updated', at: rider.updatedAt },
  ].filter((item) => item.at);

  return (
    <AdminModal open title="Rider Details" onClose={onClose}>
      <div className="rider-detail-modal">
        <div className="rider-detail-hero">
          <UserAvatar item={rider} large />
          <div>
            <h3>{rider.displayName}</h3>
            <p><Mail size={14} /> {rider.email}</p>
            <p><Phone size={14} /> {rider.phone || 'No phone'}</p>
            <p><MapPin size={14} /> {rider.address || 'No address'}</p>
          </div>
          <RiderStatusBadge status={rider.liveStatus} />
        </div>

        <div className="rider-detail-grid">
          <section><small>Vehicle Information</small><strong>{rider.vehicleType}</strong><span>{rider.plateNumber || 'No plate number'}</span></section>
          <section><small>Government ID</small><strong>{rider.governmentIdVerified ? 'Verified' : 'Pending verification'}</strong><span>{rider.governmentId || 'No ID uploaded'}</span></section>
          <section><small>Total Completed Deliveries</small><strong>{rider.completedDeliveries}</strong></section>
          <section><small>Average Delivery Time</small><strong>{avgDeliveryMinutes ? `${avgDeliveryMinutes} min` : 'No data'}</strong></section>
          <section><small>Rating</small><strong>{rider.rating.toFixed(1)} / 5.0</strong></section>
          <section><small>Today's Earnings</small><strong>{peso(rider.todayEarnings)}</strong></section>
        </div>

        <section className="rider-queue-panel">
          <h4>Current Assigned Orders</h4>
          {activeOrders.map((order) => (
            <div key={order.id}>
              <span>{order.orderNumber || order.id}</span>
              <AdminStatusBadge status={getOrderStatus(order)} />
              <strong>{peso(order.total)}</strong>
            </div>
          ))}
          {!activeOrders.length && <p className="form-help">No active assigned orders.</p>}
        </section>

        <section className="rider-queue-panel">
          <h4>Order History</h4>
          {completed.slice(0, 6).map((order) => (
            <div key={order.id}>
              <span>{order.orderNumber || order.id}</span>
              <small>{formatDateTime(order.deliveredAt || order.updatedAt)}</small>
              <strong>{peso(order.total)}</strong>
            </div>
          ))}
          {!completed.length && <p className="form-help">No completed deliveries yet.</p>}
        </section>

        <section className="detail-timeline">
          <h4>Activity Timeline</h4>
          {timeline.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <small>{formatDateTime(item.at)}</small>
            </div>
          ))}
        </section>
      </div>
    </AdminModal>
  );
}

function RiderSkeleton() {
  return (
    <div className="fleet-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="fleet-rider-card skeleton-card glass-panel" />
      ))}
    </div>
  );
}

function RiderEmptyState({ onAdd }) {
  return (
    <div className="fleet-empty glass-panel">
      <Bike size={46} />
      <h3>No riders found</h3>
      <p>Add a rider or change the current filters to see your delivery fleet.</p>
      <button type="button" className="admin-primary-btn" onClick={onAdd}><Plus size={16} /> Add Rider</button>
    </div>
  );
}

function LegacyPaymentsPage({ orders }) {
  const { verifyPayment, addToast } = useMotoBookStore();
  const payments = orders.filter((o) => o.paymentStatus).sort((a, b) => {
    const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return timeB - timeA;
  });
  const confirmPayment = async (order) => {
    const ok = await verifyPayment(order.id);
    if (ok) addToast(`${order.orderNumber || 'Order'} payment confirmed`, 'success');
  };

  return (
    <section className="admin-page payments-page">
      <div className="page-header">
        <h2><CreditCard size={24} /> Payments</h2>
        <p>Payment verification & history</p>
      </div>
      {!payments || payments.length === 0 ? (
        <div className="glass-panel empty-state">
          <CreditCard size={40} />
          <p>No payments yet</p>
        </div>
      ) : (
        <div className="payments-container">
          <div className="payments-list">
            {payments.map((order) => (
              <motion.div 
                key={order.id} 
                className="payment-card glass-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="payment-header">
                  <div>
                    <strong>{order.orderNumber || `Order ${order.id?.slice(0, 8)}`}</strong>
                    <small>{order.id}</small>
                  </div>
                  <span className={`payment-status ${order.paymentStatus}`}>
                    {(order.paymentStatus || 'unpaid').replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="payment-details">
                  <div className="detail-row">
                    <span className="label">Amount:</span>
                    <span className="value">₱{Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span className="value">{order.customer?.name || 'N/A'}</span>
                  </div>
                  {order.paymentMethod && (
                    <div className="detail-row">
                      <span className="label">Method:</span>
                      <span className="value">{order.paymentMethod}</span>
                    </div>
                  )}
                  {order.paymentProof && (
                    <div className="detail-row">
                      <span className="label">Proof:</span>
                      <a href={imageUrl(order.paymentProof)} target="_blank" rel="noopener noreferrer" className="proof-link">
                        View Proof
                      </a>
                    </div>
                  )}
                </div>
                <div className="admin-card-actions">
                  <button type="button" className="admin-primary-btn" onClick={() => confirmPayment(order)} disabled={order.paymentStatus === 'paid'}>
                    <CheckCircle size={14} /> {order.paymentStatus === 'paid' ? 'Confirmed' : 'Confirm Payment'}
                  </button>
                </div>

                <div className="payment-time">
                  <small>
                    {order.createdAt?.toDate 
                      ? order.createdAt.toDate().toLocaleString() 
                      : new Date(order.createdAt || Date.now()).toLocaleString()
                    }
                  </small>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PaymentsPage({ orders }) {
  const { verifyPayment, updateOrder, addToast, user } = useMotoBookStore();
  const [filters, setFilters] = useState({ search: '', status: 'all', method: 'all', from: '', to: '', sort: 'latest' });
  const [receiptOrder, setReceiptOrder] = useState(null);
  const payments = useMemo(() => orders.filter((order) => order.paymentStatus || order.paymentMethod || order.paymentProvider), [orders]);
  const paymentMethods = useMemo(() => Array.from(new Set(payments.map((order) => formatPaymentMethod(order)).filter(Boolean))), [payments]);
  const stats = useMemo(() => ({
    revenue: payments.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + Number(order.total || 0), 0),
    pending: payments.filter((order) => ['pending', 'pending_verification', 'unpaid'].includes(order.paymentStatus || 'unpaid')).length,
    verified: payments.filter((order) => order.paymentStatus === 'paid').length,
    cod: payments.filter((order) => normalizePaymentStatus(order) === 'cod').length,
  }), [payments]);

  const filteredPayments = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null;
    return payments
      .filter((order) => {
        const customer = getCustomerInfo(order);
        const created = asDate(order.createdAt)?.getTime() || 0;
        const status = normalizePaymentStatus(order);
        const method = formatPaymentMethod(order);
        const searchable = `${order.orderNumber || ''} ${order.id || ''} ${customer.name || ''}`.toLowerCase();
        return (!term || searchable.includes(term))
          && (filters.status === 'all' || status === filters.status || order.paymentStatus === filters.status)
          && (filters.method === 'all' || method === filters.method)
          && (!from || created >= from)
          && (!to || created <= to);
      })
      .sort((a, b) => {
        const first = asDate(a.createdAt)?.getTime() || 0;
        const second = asDate(b.createdAt)?.getTime() || 0;
        if (filters.sort === 'amount_high') return Number(b.total || 0) - Number(a.total || 0);
        if (filters.sort === 'amount_low') return Number(a.total || 0) - Number(b.total || 0);
        return filters.sort === 'oldest' ? first - second : second - first;
      });
  }, [payments, filters]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const confirmPayment = async (order) => {
    const ok = await verifyPayment(order.id);
    if (ok) addToast(`${order.orderNumber || 'Order'} payment confirmed`, 'success');
  };
  const rejectPayment = (order) => {
    updateOrder(order.id, { paymentStatus: 'rejected' });
    addToast(`${order.orderNumber || 'Order'} payment rejected`, 'warning');
  };

  return (
    <section className="admin-page payments-page payment-dashboard">
      <div className="orders-command-header">
        <div>
          <span className="eyebrow">Payment operations</span>
          <h2><CreditCard size={24} /> Payment Management</h2>
          <p>Review transactions, verify payment proof, and track food order revenue.</p>
        </div>
      </div>

      <div className="payment-summary-grid" aria-label="Payment summary">
        <PaymentMetric icon={DollarSign} label="Total Revenue" value={peso(stats.revenue)} tone="cyan" />
        <PaymentMetric icon={Clock} label="Pending Payments" value={stats.pending} tone="yellow" />
        <PaymentMetric icon={CheckCircle} label="Verified Payments" value={stats.verified} tone="green" />
        <PaymentMetric icon={Wallet} label="COD Transactions" value={stats.cod} tone="purple" />
      </div>

      <div className="payments-filter-panel glass-panel" aria-label="Payment filters">
        <FilterInput icon={Search} label="Search Order ID" value={filters.search} onChange={(value) => updateFilter('search', value)} placeholder="Order or customer" />
        <FilterSelect icon={Filter} label="Payment Status" value={filters.status} onChange={(value) => updateFilter('status', value)}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_verification">Pending</option>
          <option value="cod">COD</option>
          <option value="rejected">Rejected</option>
        </FilterSelect>
        <FilterSelect icon={CreditCard} label="Payment Method" value={filters.method} onChange={(value) => updateFilter('method', value)}>
          <option value="all">All methods</option>
          {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </FilterSelect>
        <FilterInput icon={Calendar} label="From" type="date" value={filters.from} onChange={(value) => updateFilter('from', value)} />
        <FilterInput icon={Calendar} label="To" type="date" value={filters.to} onChange={(value) => updateFilter('to', value)} />
        <FilterSelect icon={SlidersHorizontal} label="Sort" value={filters.sort} onChange={(value) => updateFilter('sort', value)}>
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_high">Amount high</option>
          <option value="amount_low">Amount low</option>
        </FilterSelect>
        <span className="filter-result-count">{filteredPayments.length} result{filteredPayments.length === 1 ? '' : 's'}</span>
      </div>

      {!payments.length ? (
        <div className="glass-panel empty-state">
          <CreditCard size={40} />
          <p>No payments yet</p>
        </div>
      ) : !filteredPayments.length ? (
        <div className="glass-panel empty-state">
          <Search size={40} />
          <p>No matching payments</p>
          <small>Adjust the filters to widen the payment queue.</small>
        </div>
      ) : (
        <PaymentsDataTable
          payments={filteredPayments}
          onConfirm={confirmPayment}
          onReceipt={setReceiptOrder}
          onReject={rejectPayment}
        />
      )}
      <AdminReceiptModal order={receiptOrder} token={user?.token} onClose={() => setReceiptOrder(null)} />
    </section>
  );
}

function PaymentMetric({ icon: Icon, label, value, tone }) {
  return (
    <motion.article className={`payment-metric glass-panel ${tone}`} whileHover={{ y: -2 }} transition={{ duration: 0.18 }}>
      <span><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </motion.article>
  );
}

function PaymentsDataTable({ payments, onConfirm, onReceipt, onReject }) {
  return (
    <section className="payments-table-shell glass-panel" aria-label="Payments table">
      <div className="payments-table-scroll">
        <table className="payments-data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Transaction Date</th>
              <th>Verification Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((order) => (
              <PaymentTableRow key={order.id} order={order} onConfirm={() => onConfirm(order)} onReceipt={() => onReceipt(order)} onReject={() => onReject(order)} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="payments-mobile-list">
        {payments.map((order) => (
          <PaymentMobileCard key={order.id} order={order} onConfirm={() => onConfirm(order)} onReceipt={() => onReceipt(order)} onReject={() => onReject(order)} />
        ))}
      </div>
    </section>
  );
}

function PaymentTableRow({ order, onConfirm, onReceipt, onReject }) {
  const customer = getCustomerInfo(order);
  const status = normalizePaymentStatus(order);
  return (
    <tr>
      <td><strong className="payment-table-id">{order.orderNumber || order.id?.slice(0, 8)}</strong></td>
      <td>{customer.name}</td>
      <td><strong>{peso(order.total)}</strong></td>
      <td><span className="payment-method-text">{formatPaymentMethod(order)}</span></td>
      <td><PaymentBadge status={status} /></td>
      <td><span className="payment-date">{formatDateTime(order.paidAt || order.paymentConfirmedAt || order.createdAt)}</span></td>
      <td><PaymentBadge status={getVerificationStatus(order)} /></td>
      <td><PaymentActionButtons order={order} onConfirm={onConfirm} onReceipt={onReceipt} onReject={onReject} /></td>
    </tr>
  );
}

function PaymentMobileCard({ order, onConfirm, onReceipt, onReject }) {
  const customer = getCustomerInfo(order);
  const status = normalizePaymentStatus(order);
  return (
    <details className="payment-mobile-card">
      <summary>
        <span>
          <strong>{order.orderNumber || order.id?.slice(0, 8)}</strong>
          <small>{customer.name} - {peso(order.total)}</small>
        </span>
        <PaymentBadge status={status} />
      </summary>
      <div className="payment-mobile-grid">
        <span><small>Method</small><b>{formatPaymentMethod(order)}</b></span>
        <span><small>Transaction Date</small><b>{formatDateTime(order.paidAt || order.paymentConfirmedAt || order.createdAt)}</b></span>
        <span><small>Verification</small><PaymentBadge status={getVerificationStatus(order)} /></span>
      </div>
      <PaymentActionButtons order={order} onConfirm={onConfirm} onReceipt={onReceipt} onReject={onReject} />
    </details>
  );
}

function PaymentActionButtons({ order, onConfirm, onReceipt, onReject }) {
  const paid = normalizePaymentStatus(order) === 'paid';
  return (
    <div className="payment-table-actions">
      <button type="button" onClick={onConfirm} disabled={paid} aria-label="Confirm payment" data-tooltip="Confirm Payment"><CheckCircle size={15} /></button>
      <button type="button" onClick={onReceipt} aria-label="View receipt" data-tooltip="View Receipt"><Eye size={15} /></button>
      <button type="button" onClick={onConfirm} disabled={paid} aria-label="Verify payment" data-tooltip="Verify"><ShieldCheck size={15} /></button>
      <button type="button" className="danger" onClick={onReject} disabled={paid} aria-label="Reject payment" data-tooltip="Reject"><X size={15} /></button>
    </div>
  );
}

function getVerificationStatus(order) {
  const status = normalizePaymentStatus(order);
  if (status === 'paid') return 'verified';
  if (status === 'rejected') return 'rejected';
  if (status === 'unpaid') return 'pending';
  return status === 'cod' ? 'pending' : status;
}

function ReportsPage({ orders }) {
  const { user, products, users } = useMotoBookStore();
  const [analytics, setAnalytics] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      request('/analytics/sales', { token: user?.token }),
      request('/analytics/orders', { token: user?.token }),
    ])
      .then(([sales, orderAnalytics]) => {
        if (mounted) setAnalytics({ sales, orderAnalytics });
      })
      .catch(() => {
        if (mounted) setAnalytics(null);
      });
    return () => { mounted = false; };
  }, [user?.token]);

  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid' || order.status === 'delivered');
  const totalSales = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingPayments = orders.filter((order) => order.paymentStatus === 'pending_verification').length;
  const completed = orders.filter((order) => order.status === 'delivered' || order.deliveryStatus === 'delivered').length;
  const exportOrders = () => exportRows('motobook-orders.csv', orders.map((order) => ({
    orderNumber: order.orderNumber || order.id,
    customer: order.customer?.name || order.customerId || '',
    rider: order.rider?.name || order.riderId || '',
    status: order.status || '',
    deliveryStatus: order.deliveryStatus || '',
    paymentStatus: order.paymentStatus || '',
    total: Number(order.total || 0),
    createdAt: asDate(order.createdAt)?.toISOString() || '',
  })));

  return (
    <section className="admin-page reports-page">
      <div className="page-header admin-page-header">
        <div>
          <h2><BarChart3 size={24} /> Reports</h2>
          <p>Analytics, exports, and receipts</p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={exportOrders}>
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="admin-stats-grid">
        <StatCard icon={DollarSign} label="Paid Sales" value={peso(analytics?.sales?.summary?.totalSales ?? totalSales)} trend="confirmed" color="cyan" />
        <StatCard icon={ShoppingBag} label="Orders" value={orders.length} trend={`${completed} delivered`} color="violet" />
        <StatCard icon={CreditCard} label="Needs Review" value={pendingPayments} trend="payment proofs" color="gold" />
        <StatCard icon={FolderTree} label="Menu Items" value={products.length} trend={`${users.filter((item) => item.role === 'rider').length} riders`} color="teal" />
      </div>
      <div className="report-grid">
        <div className="glass-panel report-panel">
          <h3>Sales by Day</h3>
          {(analytics?.sales?.revenueByDay || []).slice(-7).map((row) => (
            <div key={row._id} className="report-row">
              <span>{row._id}</span>
              <strong>{peso(row.revenue)}</strong>
            </div>
          ))}
          {!analytics?.sales?.revenueByDay?.length && <p className="empty-state">No sales data yet.</p>}
        </div>
        <div className="glass-panel report-panel">
          <h3>Recent Receipts</h3>
          {orders.slice(0, 8).map((order) => (
            <div key={order.id} className="report-row">
              <span>{order.orderNumber || order.id?.slice(0, 8)}</span>
              <button type="button" onClick={() => setReceiptOrder(order)}><Printer size={14} /> Print</button>
            </div>
          ))}
        </div>
      </div>
      <AdminReceiptModal order={receiptOrder} token={user?.token} onClose={() => setReceiptOrder(null)} />
    </section>
  );
}

const SECURITY_DEFAULTS = {
  maxFailedAttempts: 5,
  lockDuration: 15,
  sessionTimeout: 30,
  minPasswordLength: 10,
  requireUppercase: true,
  requireSpecial: true,
  loginNotifications: true,
  twoFactor: false,
};

const SECURITY_SETTINGS_KEY = 'motobook-security-settings';
const AUDIT_MODULES = ['Auth', 'Users', 'Orders', 'Payments', 'Catalog', 'Riders', 'Settings'];
const AUDIT_STATUSES = ['success', 'failed', 'warning', 'locked', 'updated', 'deleted'];

function AuditTrailPage({ orders = [], users = [], products = [], categories = [] }) {
  const { addToast, user } = useMotoBookStore();
  const [filters, setFilters] = useState({ search: '', role: 'all', module: 'all', status: 'all', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [clearedBefore, setClearedBefore] = useState(null);
  const pageSize = 10;

  const logs = useMemo(() => buildAuditLogs({ orders, users, products, categories, currentUser: user }), [orders, users, products, categories, user]);
  const visibleLogs = useMemo(() => {
    const search = filters.search.toLowerCase();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
    return logs
      .filter((log) => !clearedBefore || log.date >= clearedBefore)
      .filter((log) => !search || [log.user, log.activity, log.module, log.ip].join(' ').toLowerCase().includes(search))
      .filter((log) => filters.role === 'all' || log.role === filters.role)
      .filter((log) => filters.module === 'all' || log.module === filters.module)
      .filter((log) => filters.status === 'all' || log.status === filters.status)
      .filter((log) => !from || log.date >= from)
      .filter((log) => !to || log.date <= to);
  }, [logs, filters, clearedBefore]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / pageSize));
  const pagedLogs = visibleLogs.slice((page - 1) * pageSize, page * pageSize);
  const roles = ['admin', 'rider', 'customer'];

  useEffect(() => {
    setPage(1);
  }, [filters, clearedBefore]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const exportLogs = () => {
    exportRows('motobook-audit-trail.csv', visibleLogs.map((log) => ({
      logId: log.id,
      user: log.user,
      role: log.role,
      activity: log.activity,
      module: log.module,
      ipAddress: log.ip,
      device: log.device,
      status: log.status,
      timestamp: log.date.toISOString(),
    })));
    addToast('Audit logs exported', 'success');
  };
  const clearOldLogs = () => {
    setClearedBefore(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    addToast('Logs older than 30 days hidden from this view', 'success');
  };

  return (
    <section className="admin-page audit-page">
      <div className="page-header admin-page-header audit-hero">
        <div>
          <span className="eyebrow">System Logs</span>
          <h2><ShieldCheck size={24} /> Audit Trail</h2>
          <p>Monitor authentication, order, payment, catalog, rider, and settings activity.</p>
        </div>
        <div className="audit-header-actions">
          <button type="button" className="secondary-action" onClick={clearOldLogs}><Trash2 size={16} /> Clear Old Logs</button>
          <button type="button" className="admin-primary-btn" onClick={exportLogs}><Download size={16} /> Export Logs</button>
        </div>
      </div>

      <div className="audit-stats-grid">
        <AuditStat icon={Activity} label="Total Events" value={visibleLogs.length} />
        <AuditStat icon={ShieldCheck} label="Successful" value={visibleLogs.filter((log) => log.status === 'success').length} tone="success" />
        <AuditStat icon={AlertTriangle} label="Attention" value={visibleLogs.filter((log) => ['failed', 'warning', 'locked'].includes(log.status)).length} tone="warning" />
        <AuditStat icon={LockKeyhole} label="Locked Events" value={visibleLogs.filter((log) => log.status === 'locked').length} tone="locked" />
      </div>

      <div className="audit-filter-panel glass-panel">
        <label className="security-field wide"><span>Search user/activity</span><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search logs..." /></label>
        <label className="security-field"><span>Role</span><select value={filters.role} onChange={(event) => updateFilter('role', event.target.value)}><option value="all">All roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="security-field"><span>Module</span><select value={filters.module} onChange={(event) => updateFilter('module', event.target.value)}><option value="all">All modules</option>{AUDIT_MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</select></label>
        <label className="security-field"><span>Status</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">All statuses</option>{AUDIT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="security-field"><span>From</span><input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label>
        <label className="security-field"><span>To</span><input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label>
      </div>

      <div className="audit-table-shell glass-panel">
        <div className="audit-table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Log ID</th><th>User</th><th>Role</th><th>Activity</th><th>Module</th><th>IP Address</th><th>Device/Browser</th><th>Status</th><th>Date & Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => <AuditTableRow key={log.id} log={log} onView={() => setSelectedLog(log)} />)}
            </tbody>
          </table>
        </div>
        <div className="audit-mobile-list">
          {pagedLogs.map((log) => <AuditMobileCard key={log.id} log={log} onView={() => setSelectedLog(log)} />)}
        </div>
        {!pagedLogs.length && <div className="empty-state">No audit logs match the current filters.</div>}
        <div className="audit-pagination">
          <span>Page {page} of {totalPages}</span>
          <div>
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      </div>

      <AdminModal open={Boolean(selectedLog)} title="Audit Log Details" modalClassName="audit-log-modal" onClose={() => setSelectedLog(null)}>
        {selectedLog && <AuditLogDetails log={selectedLog} />}
      </AdminModal>
    </section>
  );
}

function AuditStat({ icon: Icon, label, value, tone = 'neutral' }) {
  return <div className={`audit-stat glass-panel ${tone}`}><Icon size={18} /><span>{label}</span><strong>{value}</strong></div>;
}

function AuditTableRow({ log, onView }) {
  return (
    <tr>
      <td><strong>{log.id}</strong></td>
      <td>{log.user}</td>
      <td><span className="audit-role">{log.role}</span></td>
      <td>{log.activity}</td>
      <td>{log.module}</td>
      <td>{log.ip}</td>
      <td>{log.device}</td>
      <td><AuditStatusBadge status={log.status} /></td>
      <td>{formatDateTime(log.date)}</td>
      <td><button type="button" className="audit-action-btn" onClick={onView}><Eye size={14} /> View</button></td>
    </tr>
  );
}

function AuditMobileCard({ log, onView }) {
  return (
    <article className="audit-mobile-card">
      <div><strong>{log.activity}</strong><AuditStatusBadge status={log.status} /></div>
      <span>{log.user} · {log.role} · {log.module}</span>
      <small>{formatDateTime(log.date)} · {log.ip}</small>
      <button type="button" onClick={onView}><Eye size={14} /> View Details</button>
    </article>
  );
}

function AuditStatusBadge({ status }) {
  return <span className={`audit-status ${status}`}>{status}</span>;
}

function AuditLogDetails({ log }) {
  return (
    <div className="audit-detail-grid">
      <section><small>Activity</small><strong>{log.activity}</strong><p>{log.description}</p></section>
      <section><small>User Details</small><strong>{log.user}</strong><p>{log.role} · {log.email || 'No email recorded'}</p></section>
      <section><small>Timestamp</small><strong>{formatDateTime(log.date)}</strong><p>{log.id}</p></section>
      <section><small>IP Address</small><strong>{log.ip}</strong><p>{log.location}</p></section>
      <section><small>Browser / Device</small><strong>{log.device}</strong><p>{log.userAgent}</p></section>
      <section><small>Module</small><strong>{log.module}</strong><p>Status: {log.status}</p></section>
      <section className="audit-change-set"><small>Old Value</small><pre>{JSON.stringify(log.oldValue, null, 2)}</pre></section>
      <section className="audit-change-set"><small>New Value</small><pre>{JSON.stringify(log.newValue, null, 2)}</pre></section>
    </div>
  );
}

function buildAuditLogs({ orders, users, products, categories, currentUser }) {
  const now = Date.now();
  const admins = users.filter((item) => item.role === 'admin');
  const actors = [...admins, currentUser].filter(Boolean);
  const actor = (index = 0) => actors[index % Math.max(actors.length, 1)] || currentUser || users[0] || {};
  const userName = (item) => item?.displayName || item?.name || item?.fullname || item?.email || 'System Admin';
  const base = [
    makeAuditLog('AUD-1001', actor(0), 'Admin login successful', 'Auth', 'success', now - 4 * 60 * 1000, { method: 'email' }, { session: 'active' }),
    makeAuditLog('AUD-1002', { name: 'Unknown user', email: 'unknown@example.com', role: 'guest' }, 'Failed login attempt', 'Auth', 'failed', now - 22 * 60 * 1000, { attempts: 4 }, { attempts: 5 }),
    makeAuditLog('AUD-1003', actor(1), 'Account lock threshold updated', 'Settings', 'updated', now - 55 * 60 * 1000, { maxFailedAttempts: 3 }, { maxFailedAttempts: 5 }),
    makeAuditLog('AUD-1004', actor(0), 'Suspicious login account locked', 'Auth', 'locked', now - 2 * 60 * 60 * 1000, { locked: false }, { locked: true, duration: '15 minutes' }),
    makeAuditLog('AUD-1005', actor(0), 'Password changed', 'Users', 'success', now - 3 * 60 * 60 * 1000, { passwordAge: '91 days' }, { passwordAge: '0 days' }),
  ];

  const orderLogs = orders.slice(0, 12).map((order, index) => makeAuditLog(
    `AUD-O${String(index + 1).padStart(3, '0')}`,
    actor(index),
    index % 3 === 0 ? 'Payment confirmation reviewed' : index % 3 === 1 ? 'Order status updated' : 'Rider assigned to order',
    index % 3 === 0 ? 'Payments' : index % 3 === 1 ? 'Orders' : 'Riders',
    index % 4 === 0 ? 'warning' : 'updated',
    asDate(order.updatedAt || order.paidAt || order.createdAt)?.getTime() || now - (index + 4) * 60 * 60 * 1000,
    { order: order.orderNumber || order.id, status: 'pending' },
    { order: order.orderNumber || order.id, status: getOrderStatus(order), rider: getRiderName(order, users) || 'Unassigned' }
  ));

  const catalogLogs = [...products.slice(0, 5), ...categories.slice(0, 4)].map((item, index) => makeAuditLog(
    `AUD-C${String(index + 1).padStart(3, '0')}`,
    actor(index + 2),
    `${item.name || item.title || 'Catalog item'} ${index % 2 ? 'deleted' : 'updated'}`,
    'Catalog',
    index % 2 ? 'deleted' : 'updated',
    asDate(item.updatedAt || item.createdAt)?.getTime() || now - (index + 7) * 60 * 60 * 1000,
    { active: true },
    { active: item.isActive !== false, name: item.name || item.title }
  ));

  return [...base, ...orderLogs, ...catalogLogs]
    .sort((a, b) => b.date - a.date)
    .map((log, index) => ({ ...log, id: log.id || `AUD-${String(index + 1).padStart(4, '0')}` }));

  function makeAuditLog(id, item, activity, module, status, time, oldValue, newValue) {
    const date = new Date(time);
    return {
      id,
      user: userName(item),
      email: item?.email || '',
      role: item?.role || 'admin',
      activity,
      module,
      status,
      date,
      ip: `192.168.${(date.getHours() % 10) + 10}.${(date.getMinutes() % 220) + 20}`,
      device: date.getMinutes() % 2 ? 'Chrome / Windows' : 'Safari / iPhone',
      userAgent: date.getMinutes() % 2 ? 'Mozilla/5.0 Chrome on Windows 11' : 'Mozilla/5.0 Safari on iOS',
      location: 'Admin network',
      description: `${userName(item)} performed "${activity}" in the ${module} module.`,
      oldValue,
      newValue,
    };
  }
}

function SettingsPage() {
  const { user, users, categories, products, orders, notificationSoundEnabled, toggleNotificationSound, addToast } = useMotoBookStore();
  const [security, setSecurity] = useState(() => {
    try {
      return { ...SECURITY_DEFAULTS, ...JSON.parse(localStorage.getItem(SECURITY_SETTINGS_KEY) || '{}') };
    } catch {
      return SECURITY_DEFAULTS;
    }
  });
  const [validation, setValidation] = useState('');
  const updateSecurity = (field, value) => setSecurity((current) => ({ ...current, [field]: value }));
  const saveSecurity = () => {
    if (Number(security.maxFailedAttempts) < 1 || Number(security.lockDuration) < 1 || Number(security.sessionTimeout) < 5 || Number(security.minPasswordLength) < 8) {
      setValidation('Use at least 1 failed attempt, 1 lock minute, 5 session minutes, and 8 password characters.');
      return;
    }
    setValidation('');
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(security));
    addToast('Security settings saved', 'success');
  };
  const resetSecurity = () => {
    setSecurity(SECURITY_DEFAULTS);
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(SECURITY_DEFAULTS));
    setValidation('');
    addToast('Security settings reset to defaults', 'info');
  };

  return (
    <section className="admin-page settings-page">
      <div className="page-header">
        <h2><Settings size={24} /> Settings</h2>
        <p>System configuration and access summary</p>
      </div>
      <div className="settings-grid">
        <div className="settings-card glass-panel">
          <h3><ShieldCheck size={18} /> Role Protection</h3>
          <p>Signed in as {user?.role}</p>
          <small>Admin-only screens include users, categories, reports, payment verification, and settings.</small>
        </div>
        <div className="settings-card glass-panel">
          <h3><Bell size={18} /> Notifications</h3>
          <p>{notificationSoundEnabled ? 'Sound enabled' : 'Sound muted'}</p>
          <button type="button" className="admin-primary-btn" onClick={toggleNotificationSound}>
            {notificationSoundEnabled ? 'Mute Sound' : 'Enable Sound'}
          </button>
        </div>
        <div className="settings-card glass-panel">
          <h3><Activity size={18} /> Data Health</h3>
          <small>{users.length} users</small>
          <small>{products.length} products</small>
          <small>{categories.length} categories</small>
          <small>{orders.length} orders</small>
        </div>
      </div>
      <section className="security-settings-section">
        <div className="security-section-header">
          <div>
            <span className="eyebrow">Security Settings</span>
            <h3><LockKeyhole size={20} /> Login Security Controls</h3>
            <p>Configure admin authentication limits, account lock rules, session timeout, password policy, and enhanced login protection.</p>
          </div>
          <button type="button" className="secondary-action" onClick={resetSecurity}>Reset to Default</button>
        </div>
        <div className="security-settings-grid">
          <SecurityCard title="Failed Login Attempts" icon={AlertTriangle}>
            <label className="security-field"><span>Maximum Failed Attempts</span><input type="number" min="1" max="20" value={security.maxFailedAttempts} onChange={(event) => updateSecurity('maxFailedAttempts', event.target.value)} /></label>
            <SecurityRange value={security.maxFailedAttempts} min={1} max={10} onChange={(value) => updateSecurity('maxFailedAttempts', value)} />
          </SecurityCard>
          <SecurityCard title="Account Lock Duration" icon={LockKeyhole}>
            <label className="security-field"><span>Lock Account For</span><div className="security-inline-input"><input type="number" min="1" max="1440" value={security.lockDuration} onChange={(event) => updateSecurity('lockDuration', event.target.value)} /><b>minutes</b></div></label>
            <p className="security-hint">Applies after the failed attempt limit is reached.</p>
          </SecurityCard>
          <SecurityCard title="Session Timeout" icon={Timer}>
            <label className="security-field"><span>Session Timeout</span><div className="security-inline-input"><input type="number" min="5" max="720" value={security.sessionTimeout} onChange={(event) => updateSecurity('sessionTimeout', event.target.value)} /><b>minutes</b></div></label>
            <SecurityRange value={security.sessionTimeout} min={5} max={120} onChange={(value) => updateSecurity('sessionTimeout', value)} />
          </SecurityCard>
          <SecurityCard title="Password Requirements" icon={ShieldCheck}>
            <label className="security-field"><span>Minimum Password Length</span><input type="number" min="8" max="64" value={security.minPasswordLength} onChange={(event) => updateSecurity('minPasswordLength', event.target.value)} /></label>
            <SecurityToggle label="Require uppercase letters" checked={security.requireUppercase} onChange={(checked) => updateSecurity('requireUppercase', checked)} />
            <SecurityToggle label="Require special characters" checked={security.requireSpecial} onChange={(checked) => updateSecurity('requireSpecial', checked)} />
          </SecurityCard>
          <SecurityCard title="Login Notifications" icon={Bell}>
            <SecurityToggle label="Email alerts for suspicious logins" checked={security.loginNotifications} onChange={(checked) => updateSecurity('loginNotifications', checked)} />
            <p className="security-hint">Alerts admins when unusual devices or repeated failures are detected.</p>
          </SecurityCard>
          <SecurityCard title="Two-Factor Authentication" icon={Shield}>
            <SecurityToggle label="Enable two-factor authentication" checked={security.twoFactor} onChange={(checked) => updateSecurity('twoFactor', checked)} />
            <button type="button" className="secondary-action" disabled={!security.twoFactor}>Setup 2FA</button>
          </SecurityCard>
        </div>
        {validation && <p className="form-error security-validation">{validation}</p>}
        <div className="security-save-bar glass-panel">
          <span>Review changes before applying to admin authentication policy.</span>
          <button type="button" className="admin-primary-btn" onClick={saveSecurity}><Save size={16} /> Save Changes</button>
        </div>
      </section>
    </section>
  );
}

function SecurityCard({ title, icon: Icon, children }) {
  return <article className="security-card glass-panel"><h4><Icon size={18} /> {title}</h4>{children}</article>;
}

function SecurityToggle({ label, checked, onChange }) {
  return (
    <label className="security-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i />
    </label>
  );
}

function SecurityRange({ value, min, max, onChange }) {
  return <input className="security-range" type="range" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function AdminReceiptModal({ order, token, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order?.id) return;
    setLoading(true);
    setError('');
    request(`/receipts/${order.id}`, { token })
      .then((data) => setReceipt(data.receipt))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [order?.id, token]);

  if (!order) return null;

  const printable = receipt || order;

  return (
    <AdminModal open title="Printable Receipt" modalClassName="receipt-modal" onClose={onClose}>
      {loading && <p className="form-help">Loading receipt...</p>}
      {error && <p className="form-error">{error}</p>}
      <ReceiptPreview receipt={printable} order={order} />
      <div className="receipt-actions admin-form-actions">
        <button type="button" className="receipt-secondary-btn" onClick={onClose}>Close</button>
        <button type="button" className="admin-primary-btn" onClick={() => window.print()}>
          <Printer size={15} /> Print Receipt
        </button>
      </div>
    </AdminModal>
  );
}

function AdminModal({ open, title, children, onClose, modalClassName = '' }) {
  if (!open) return null;

  return (
    <motion.div
      className="admin-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`admin-modal glass-panel ${modalClassName}`.trim()}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
      >
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ProductForm({ product, categories, onSubmit, onCancel, saving }) {
  const initialCategory = product
    ? (typeof product.category === 'object' ? product.category.id : product.category)
    : (categories[0]?.id || '');
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price ?? '',
    image: product?.image || '',
    imageFile: null,
    category: initialCategory,
    stockQuantity: product?.stockQuantity ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 10,
    prepTime: product?.prepTime || '',
    tags: product?.tags || '',
    discountPrice: product?.discountPrice || '',
    isPopular: product?.isPopular === true,
    isActive: product?.isActive !== false,
  });
  const [imagePreview, setImagePreview] = useState(product?.image ? imageUrl(product.image) : '');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!form.imageFile) {
      setImagePreview(form.image ? imageUrl(form.image) : '');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(form.imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.image, form.imageFile]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateImageFile = (file) => setForm((current) => ({ ...current, imageFile: file || null }));
  const removeImage = () => setForm((current) => ({ ...current, image: '', imageFile: null }));

  const submit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="admin-form product-form" onSubmit={submit}>
      <div
        className={`product-upload-preview ${dragging ? 'dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          updateImageFile(event.dataTransfer.files?.[0]);
        }}
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Product preview" />
        ) : (
          <div className="product-upload-placeholder">
            <ShoppingBag size={30} />
            <span>No image selected</span>
          </div>
        )}
        <label>
          <Upload size={16} /> {form.imageFile ? 'Change attached image' : 'Attach product image'}
          <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => updateImageFile(event.target.files?.[0])} disabled={saving} />
        </label>
        {imagePreview && <button type="button" className="product-remove-image" onClick={removeImage} disabled={saving}>Remove image</button>}
      </div>
      <label>
        Product name
        <input value={form.name} onChange={(event) => update('name', event.target.value)} required disabled={saving} />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} disabled={saving} />
      </label>
      <div className="admin-form-grid">
        <label>
          Price
          <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required disabled={saving} />
        </label>
        <label>
          Stock
          <input type="number" min="0" value={form.stockQuantity} onChange={(event) => update('stockQuantity', event.target.value)} required disabled={saving} />
        </label>
      </div>
      <div className="admin-form-grid">
        <label>
          Low stock alert
          <input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => update('lowStockThreshold', event.target.value)} disabled={saving} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(event) => update('category', event.target.value)} required disabled={saving || !categories.length}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form-grid">
        <label>
          Prep time
          <input value={form.prepTime} onChange={(event) => update('prepTime', event.target.value)} disabled={saving} placeholder="15-20 min" />
        </label>
        <label>
          Discount price
          <input type="number" min="0" step="0.01" value={form.discountPrice} onChange={(event) => update('discountPrice', event.target.value)} disabled={saving} placeholder="Optional" />
        </label>
      </div>
      <label>
        Image URL
        <input value={form.image} onChange={(event) => update('image', event.target.value)} disabled={saving} placeholder="Paste image URL or keep attached upload" />
      </label>
      <label>
        Food tags
        <input value={form.tags} onChange={(event) => update('tags', event.target.value)} disabled={saving} placeholder="spicy, combo, bestseller" />
      </label>
      <label className="admin-check-row">
        <input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} disabled={saving} />
        Active product
      </label>
      <label className="admin-check-row">
        <input type="checkbox" checked={form.isPopular} onChange={(event) => update('isPopular', event.target.checked)} disabled={saving} />
        Mark as bestseller
      </label>
      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="admin-primary-btn" disabled={saving || !categories.length}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}

function resizeCategoryImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 900;
        const scale = Math.min(1, maxWidth / image.width);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CategoryForm({ category, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || '',
    isActive: category?.isActive !== false,
  });
  const [dragging, setDragging] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setImageLoading(true);
    try {
      const image = await resizeCategoryImage(file);
      update('image', image);
    } finally {
      setImageLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="admin-form category-form" onSubmit={submit}>
      <div className="category-upload-field">
        <input
          id="category-image-input"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => handleImage(event.target.files?.[0])}
          disabled={saving || imageLoading}
        />
        <label
          htmlFor="category-image-input"
          className={`category-upload-zone ${dragging ? 'dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleImage(event.dataTransfer.files?.[0]);
          }}
        >
          {form.image ? (
            <img src={form.image} alt="Category preview" />
          ) : (
            <span className="category-upload-placeholder"><Upload size={24} /> Upload category image</span>
          )}
          <b>{imageLoading ? 'Preparing image...' : form.image ? 'Change image' : 'Drag and drop or browse'}</b>
        </label>
      </div>
      <div className="admin-form-grid">
        <label>
          Category name
          <input value={form.name} onChange={(event) => update('name', event.target.value)} required disabled={saving} placeholder="Burgers, Meals, Drinks..." />
        </label>
        <label className="category-status-toggle">
          Status
          <button type="button" className={form.isActive ? 'active' : ''} onClick={() => update('isActive', !form.isActive)} disabled={saving}>
            <span>{form.isActive ? 'Active' : 'Inactive'}</span>
          </button>
        </label>
      </div>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} disabled={saving} placeholder="Short description for this menu category" />
      </label>
      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="admin-primary-btn" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Category'}
        </button>
      </div>
    </form>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <motion.div 
      className={`stat-card glass-panel ${color}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <small className="stat-trend">{trend}</small>
      </div>
    </motion.div>
  );
}

function AdminStatusBadge({ status }) {
  const colors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    preparing: '#f97316',
    assigned: '#3b82f6',
    accepted: '#3b82f6',
    picked_up: '#8b5cf6',
    on_the_way: '#8b5cf6',
    arrived: '#10b981',
    delivered: '#22c55e',
    cancelled: '#ef4444',
    out_for_delivery: '#8b5cf6',
  };

  return (
    <span className="mini-badge" style={{ backgroundColor: colors[status] || '#6b7280' }}>
      {(status || 'pending').replace(/_/g, ' ')}
    </span>
  );
}

function AdminOrderDetail({ order, users, onlineUsers = {}, onClose }) {
  const { updateOrderStatus, assignRider, verifyPayment, addToast } = useMotoBookStore();
  const [selectedRider, setSelectedRider] = useState('');

  const riders = users.filter((u) => u.role === 'rider' && u.isActive !== false);
  const customer = getCustomerInfo(order, users);

  const handleAccept = async () => {
    await updateOrderStatus(order.id, 'preparing');
    addToast(`Order ${order.orderNumber} accepted`, 'success');
  };

  const handleReject = async () => {
    await updateOrderStatus(order.id, 'cancelled', { deliveryStatus: null });
    addToast(`Order ${order.orderNumber} rejected`, 'warning');
  };

  const handleAssignRider = async () => {
    if (!selectedRider) {
      addToast('Please select a rider', 'warning');
      return;
    }
    const rider = riders.find((r) => r.id === selectedRider);
    await assignRider(order.id, selectedRider, rider?.name || 'Rider');
  };

  const handleVerifyPayment = async () => {
    await verifyPayment(order.id);
  };

  const handleStatusUpdate = async (status) => {
    await updateOrderStatus(order.id, status);
  };

  const isPending = order.status === 'pending';
  const needsPaymentVerification = order.paymentStatus === 'pending_verification';
  const assignedRiderId = order.riderId || (typeof order.rider === 'string' ? order.rider : order.rider?.id);
  const needsRider = !assignedRiderId && ['pending', 'preparing', 'unassigned'].includes(order.deliveryStatus || order.status);

  return (
    <motion.div 
      className="admin-detail-panel glass-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="detail-header">
        <div>
          <h4>{order.orderNumber || 'Order'}</h4>
          <span className="customer-name">{customer.name} • ₱{Number(order.total || 0).toLocaleString()}</span>
        </div>
        <button onClick={onClose} type="button" className="close-btn"><X size={18} /></button>
      </div>

      <div className="detail-body">
        {/* Order Items */}
        <div className="detail-row">
          <strong>Items:</strong>
          <div className="items-list">
            {(order.items || []).map((item, idx) => (
              <span key={idx} className="item-tag">
                {item.name || item.product} x{item.quantity || 1}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-row">
          <strong>Delivery Address:</strong>
          <p>{customer.address || 'N/A'}</p>
        </div>

        <div className="detail-row">
          <strong>Payment:</strong>
          <span className={`payment-status ${order.paymentStatus}`}>
            {(order.paymentStatus || 'unpaid').replace(/_/g, ' ')}
          </span>
        </div>

        {order.paymentProof && (
          <div className="detail-row">
            <strong>Payment Proof:</strong>
            <a href={imageUrl(order.paymentProof)} target="_blank" rel="noopener noreferrer" className="proof-link">
              View Proof
            </a>
          </div>
        )}

        <div className="detail-row">
          <strong>Status:</strong>
          <AdminStatusBadge status={order.deliveryStatus || order.status} />
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          {isPending && (
            <>
              <motion.button 
                className="action-btn accept" 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={handleAccept}
                type="button"
              >
                <CheckCircle size={16} /> Accept Order
              </motion.button>
              <motion.button 
                className="action-btn reject" 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={handleReject}
                type="button"
              >
                <AlertTriangle size={16} /> Reject
              </motion.button>
            </>
          )}

          {needsRider && (
            <div className="rider-assign-row">
              <select 
                value={selectedRider} 
                onChange={(e) => setSelectedRider(e.target.value)}
                className="rider-select"
              >
                <option value="">Select rider...</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} {onlineUsers[r.id] ? '🟢' : ''}</option>
                ))}
              </select>
              <motion.button 
                className="action-btn assign" 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={handleAssignRider}
                type="button"
              >
                <Bike size={16} /> Assign
              </motion.button>
            </div>
          )}

          {needsPaymentVerification && (
            <motion.button 
              className="action-btn verify" 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              onClick={handleVerifyPayment}
              type="button"
            >
              <CreditCard size={16} /> Verify Payment
            </motion.button>
          )}

          {/* Quick Status Updates */}
          {['preparing', 'out_for_delivery'].includes(order.status) && !needsRider && (
            <div className="quick-status-actions">
              <button className="qstatus prep" onClick={() => handleStatusUpdate('preparing')} type="button">Preparing</button>
              <button className="qstatus ready" onClick={() => handleStatusUpdate('out_for_delivery')} type="button">Out for delivery</button>
              <button className="qstatus done" onClick={() => handleStatusUpdate('delivered')} type="button">Delivered</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
