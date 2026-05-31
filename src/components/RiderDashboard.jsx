import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, BarChart3, Bell, Bike, CalendarDays,
  Check, CheckCircle, Clock, Download, FileText, Filter, Gauge, Globe2, ImagePlus,
  LockKeyhole, MapPin, Navigation, Package, Phone, Power, Search, Settings, ShieldCheck,
  Star, Timer, Upload, User, Wallet, X
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase/init';
import useMotoBookStore from '../store/useMotoBookStore';
import { asDate, exportRows, peso } from '../utils/format';

const DELIVERY_STEPS = ['assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered'];
const PAGE_SIZE = 6;

export default function RiderDashboard({ activePage = 'Dashboard' }) {
  const {
    orders,
    user,
    notifications,
    notificationSoundEnabled,
    toggleNotificationSound,
    updateDeliveryStatus,
    updateMyProfile,
    markNotificationsRead,
    clearNotifications,
    addToast,
  } = useMotoBookStore();
  const [riderStatus, setRiderStatus] = useState(user?.riderStatus || (user?.isOnline ? 'online' : 'offline'));

  useEffect(() => {
    setRiderStatus(user?.riderStatus || (user?.isOnline ? 'online' : 'offline'));
  }, [user?.riderStatus, user?.isOnline]);

  const riderOrders = useMemo(() => orders.filter((order) => getRiderId(order) === user?.uid), [orders, user?.uid]);
  const metrics = useMemo(() => buildRiderMetrics(riderOrders, user), [riderOrders, user]);
  const activeDelivery = useMemo(() => (
    riderOrders.find((order) => ['accepted', 'picked_up', 'on_the_way', 'arrived'].includes(normalizeStatus(order)))
    || riderOrders.find((order) => normalizeStatus(order) === 'assigned')
  ), [riderOrders]);

  useRiderPresence(user, activeDelivery, addToast);

  const updateStatus = async (status) => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, 'riders', user.uid), {
        uid: user.uid,
        status,
        online: status !== 'offline',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, 'users', user.uid), {
        riderStatus: status,
        isAvailable: status === 'online',
        isOnline: status !== 'offline',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setRiderStatus(status);
      addToast(`Rider status set to ${status.replace('_', ' ')}`, 'success');
    } catch (error) {
      addToast(`Failed to update rider status: ${error.message}`, 'error');
    }
  };

  const orderAction = async (order, nextStatus) => {
    const updates = statusUpdates(nextStatus);
    const ok = await updateDeliveryStatus(order.id, nextStatus, updates);
    if (ok) {
      await writeRiderActivity(user?.uid, nextStatus, order, metrics);
      addToast(actionMessage(nextStatus), 'success');
    }
  };

  const rejectOrder = async (order) => {
    const ok = window.confirm(`Reject ${order.orderNumber || order.id}?`);
    if (!ok) return;
    await updateDeliveryStatus(order.id, 'rejected', {
      status: 'pending',
      riderId: null,
      rider: null,
    });
    addToast('Delivery rejected and returned to dispatch', 'info');
  };

  const commonProps = {
    user,
    orders: riderOrders,
    metrics,
    activeDelivery,
    notifications,
    notificationSoundEnabled,
    toggleNotificationSound,
    updateMyProfile,
    markNotificationsRead,
    clearNotifications,
    addToast,
    updateStatus,
    riderStatus,
    orderAction,
    rejectOrder,
  };

  if (activePage === 'Orders' || activePage === 'Riders') return <AssignedOrdersPage {...commonProps} />;
  if (activePage === 'Reports' || activePage === 'Earnings') return <EarningsPage {...commonProps} />;
  if (activePage === 'Profile') return <RiderProfilePage {...commonProps} />;
  if (activePage === 'Notifications') return <RiderNotificationsPage {...commonProps} />;
  if (activePage === 'Settings') return <RiderSettingsPage {...commonProps} />;
  return <RiderHomePage {...commonProps} />;
}

function RiderHomePage({ user, orders, metrics, activeDelivery, updateStatus, orderAction, rejectOrder, riderStatus }) {
  const currentStatus = activeDelivery && normalizeStatus(activeDelivery) !== 'assigned'
    ? 'busy_delivering'
    : riderStatus || user?.riderStatus || (user?.isOnline ? 'online' : 'offline');

  return (
    <section className="rider-portal">
      <RiderHero user={user} currentStatus={currentStatus} onStatus={updateStatus} />

      <div className="rider-analytics-grid">
        <MetricCard icon={CheckCircle} label="Total Deliveries Today" value={metrics.todayDeliveries} tone="cyan" />
        <MetricCard icon={Wallet} label="Total Earnings Today" value={peso(metrics.todayEarnings)} tone="purple" />
        <MetricCard icon={Package} label="Assigned Orders" value={metrics.assignedCount} tone="blue" />
        <MetricCard icon={Star} label="Average Rating" value={metrics.rating.toFixed(1)} tone="gold" />
      </div>

      <div className="rider-dashboard-grid">
        <CurrentDeliveryCard order={activeDelivery} onAction={orderAction} onReject={rejectOrder} featured />
        <LiveProgressCard order={activeDelivery} />
      </div>

      <div className="rider-split-grid">
        <PerformanceChart title="Daily Earnings" data={metrics.dailySeries} valuePrefix="PHP " />
        <RecentOrdersPanel orders={orders.slice(0, 5)} />
      </div>
    </section>
  );
}

function RiderHero({ user, currentStatus, onStatus }) {
  return (
    <motion.header className="rider-premium-hero glass-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <span className="eyebrow">MotoBook Rider Portal</span>
        <h2>Welcome, {user?.name?.split(' ')[0] || 'Rider'}</h2>
        <p>Manage assigned deliveries, live status, earnings, and customer handoffs in real time.</p>
      </div>
      <div className="rider-status-switcher" aria-label="Rider status">
        {[
          ['online', 'Online', 'online'],
          ['offline', 'Offline', 'offline'],
          ['busy_delivering', 'Busy Delivering', 'busy'],
        ].map(([key, label, tone]) => (
          <button key={key} className={currentStatus === key ? `active ${tone}` : tone} onClick={() => onStatus(key)} type="button">
            <span />
            {label}
          </button>
        ))}
      </div>
    </motion.header>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <motion.article className={`rider-metric-card glass-panel ${tone}`} whileHover={{ y: -4 }}>
      <span className="metric-icon"><Icon size={20} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
    </motion.article>
  );
}

function CurrentDeliveryCard({ order, onAction, onReject, featured = false }) {
  const [routeModalOpen, setRouteModalOpen] = useState(false);

  if (!order) {
    return (
      <article className={`current-delivery-card glass-panel ${featured ? 'featured' : ''}`}>
        <div className="empty-delivery">
          <Bike size={42} />
          <h3>No active delivery</h3>
          <p>New assignments will appear instantly when dispatch assigns an order.</p>
        </div>
      </article>
    );
  }

  const customer = getCustomer(order);
  const status = normalizeStatus(order);
  const actions = actionButtons(status);

  return (
    <motion.article className={`current-delivery-card glass-panel ${featured ? 'featured' : ''}`} layout>
      <div className="delivery-card-header">
        <div>
          <span className="eyebrow">Current assigned delivery</span>
          <h3>{order.orderNumber || order.id?.slice(0, 8)}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="delivery-customer-row">
        <span className="rider-avatar-lg">{customer.name.charAt(0).toUpperCase()}</span>
        <div>
          <strong>{customer.name}</strong>
          <a href={`tel:${customer.phone}`}><Phone size={13} /> {customer.phone || 'No phone'}</a>
        </div>
      </div>

      <div className="delivery-info-grid">
        <InfoItem icon={MapPin} label="Pickup Location" value={order.pickupLocation?.address || order.pickupLocation || 'MotoBook Kitchen'} />
        <InfoItem icon={Navigation} label="Dropoff Location" value={order.deliveryAddress || order.address || customer.address || 'No delivery address'} />
        <InfoItem icon={Gauge} label="Distance" value={formatDistance(order.distance)} />
        <InfoItem icon={Timer} label="Estimated Time" value={order.estimatedTime || order.estimatedDelivery || estimateEta(order)} />
        <InfoItem icon={Wallet} label="Delivery Fee" value={peso(deliveryFee(order))} />
        <InfoItem icon={Clock} label="Created" value={formatShortDate(order.createdAt)} />
      </div>

      <div className="order-items-strip">
        {(order.items || []).slice(0, 4).map((item, index) => (
          <span key={`${item.id || item.name || 'item'}-${index}`}>{item.name || item.product || 'Item'} x{item.quantity || 1}</span>
        ))}
        {!order.items?.length && <span>No listed items</span>}
      </div>

      <div className="rider-sticky-actions">
        {actions.map((action) => (
          <button key={action.status} className={`rider-action-btn ${action.tone}`} onClick={() => onAction(order, action.status)} type="button">
            <action.icon size={16} />
            {action.label}
          </button>
        ))}
        {status === 'assigned' && (
          <button className="rider-action-btn danger" onClick={() => onReject(order)} type="button">
            <X size={16} />
            Reject Order
          </button>
        )}
        <button className="rider-action-btn ghost" onClick={() => setRouteModalOpen(true)} type="button">
          <Navigation size={16} />
          Navigate
        </button>
      </div>

      <AnimatePresence>
        {routeModalOpen && (
          <NavigationModal order={order} customer={customer} onClose={() => setRouteModalOpen(false)} />
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function NavigationModal({ order, customer, onClose }) {
  const pickup = pickupLabel(order);
  const dropoff = dropoffLabel(order, customer);
  const phone = customer.phone || '';

  return (
    <motion.div
      className="admin-modal-overlay rider-route-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="admin-modal glass-panel rider-route-modal"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3><Navigation size={18} /> Navigate Delivery</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="route-map-frame">
          <iframe title="Delivery route preview" src={mapsEmbedUrl(order)} loading="lazy" />
        </div>

        <div className="route-stop-list">
          <RouteStop icon={MapPin} label="Pickup" value={pickup} />
          <RouteStop icon={Navigation} label="Dropoff" value={dropoff} />
        </div>

        <div className="route-modal-summary">
          <InfoItem icon={Gauge} label="Distance" value={formatDistance(order.distance)} />
          <InfoItem icon={Timer} label="ETA" value={order.estimatedTime || order.estimatedDelivery || estimateEta(order)} />
          <InfoItem icon={User} label="Customer" value={customer.name} />
        </div>

        <div className="route-modal-actions">
          <a className="rider-action-btn primary" href={mapsUrl(order)} target="_blank" rel="noopener noreferrer">
            <Globe2 size={16} />
            Open Maps
          </a>
          {phone ? (
            <a className="rider-action-btn ghost" href={`tel:${phone}`}>
              <Phone size={16} />
              Call Customer
            </a>
          ) : (
            <button className="rider-action-btn ghost" type="button" disabled>
              <Phone size={16} />
              No Phone
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RouteStop({ icon: Icon, label, value }) {
  return (
    <div className="route-stop">
      <span><Icon size={16} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LiveProgressCard({ order }) {
  const status = normalizeStatus(order);
  const currentIndex = Math.max(0, DELIVERY_STEPS.indexOf(status === 'arrived' ? 'on_the_way' : status));

  return (
    <article className="rider-progress-card glass-panel">
      <div className="card-title-row">
        <h3><Activity size={18} /> Live Delivery Progress</h3>
        <span>{order ? `${Math.min(currentIndex + 1, DELIVERY_STEPS.length)}/${DELIVERY_STEPS.length}` : 'Idle'}</span>
      </div>
      <div className="rider-stepper">
        {DELIVERY_STEPS.map((step, index) => {
          const done = order && index <= currentIndex;
          return (
            <div key={step} className={done ? 'done' : ''}>
              <span>{done ? <Check size={14} /> : index + 1}</span>
              <small>{step.replace(/_/g, ' ')}</small>
            </div>
          );
        })}
      </div>
      <div className="delivery-timer">
        <Clock size={16} />
        <span>Delivery timer</span>
        <strong>{order ? elapsedTime(order.acceptedAt || order.updatedAt || order.createdAt) : '00:00'}</strong>
      </div>
    </article>
  );
}

function AssignedOrdersPage({ orders, orderAction, rejectOrder }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((order) => filter === 'all' || statusGroup(normalizeStatus(order)) === filter)
      .filter((order) => {
        const customer = getCustomer(order);
        return !q || [
          order.orderNumber,
          order.id,
          customer.name,
          customer.phone,
          order.deliveryAddress,
          ...(order.items || []).map((item) => item.name || item.product),
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0));
  }, [orders, search, filter]);

  useEffect(() => setPage(1), [search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="rider-portal">
      <PageHeader icon={Package} title="Assigned Orders" subtitle="Search, filter, accept, navigate, and complete deliveries." />
      <div className="rider-command-bar glass-panel">
        <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, customer, address..." /></label>
        <div className="filter-pills">
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['accepted', 'Accepted'],
            ['delivering', 'Delivering'],
            ['completed', 'Completed'],
          ].map(([key, label]) => (
            <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} type="button">
              <Filter size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="assigned-orders-grid">
        <AnimatePresence mode="popLayout">
          {visible.map((order) => (
            <RiderOrderCard key={order.id} order={order} onAction={orderAction} onReject={rejectOrder} />
          ))}
        </AnimatePresence>
        {!visible.length && <RiderEmpty icon={Package} title="No matching orders" message="Try a different status filter or search term." />}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} />
    </section>
  );
}

function RiderOrderCard({ order, onAction, onReject }) {
  return <CurrentDeliveryCard order={order} onAction={onAction} onReject={onReject} />;
}

function EarningsPage({ orders, metrics }) {
  const transactions = orders
    .filter((order) => normalizeStatus(order) === 'delivered')
    .sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0));

  const exportCsv = () => exportRows('motobook-rider-earnings.csv', transactions.map((order) => ({
    order: order.orderNumber || order.id,
    customer: getCustomer(order).name,
    fee: deliveryFee(order),
    status: normalizeStatus(order),
    createdAt: formatShortDate(order.createdAt),
  })));

  return (
    <section className="rider-portal">
      <PageHeader icon={Wallet} title="Rider Earnings" subtitle="Daily, weekly, and monthly delivery performance." />
      <div className="rider-analytics-grid earnings">
        <MetricCard icon={Wallet} label="Today's Earnings" value={peso(metrics.todayEarnings)} tone="cyan" />
        <MetricCard icon={CalendarDays} label="Weekly Earnings" value={peso(metrics.weeklyEarnings)} tone="blue" />
        <MetricCard icon={BarChart3} label="Monthly Earnings" value={peso(metrics.monthlyEarnings)} tone="purple" />
        <MetricCard icon={CheckCircle} label="Total Deliveries" value={metrics.completedCount} tone="gold" />
        <MetricCard icon={Gauge} label="Average Delivery Fee" value={peso(metrics.averageFee)} tone="green" />
      </div>

      <div className="rider-split-grid">
        <PerformanceChart title="Daily earnings chart" data={metrics.dailySeries} valuePrefix="PHP " />
        <PerformanceChart title="Weekly performance chart" data={metrics.weeklySeries} />
      </div>

      <article className="earnings-table-card glass-panel">
        <div className="card-title-row">
          <h3><FileText size={18} /> Transaction History</h3>
          <div className="earnings-actions">
            <button onClick={exportCsv} type="button"><Download size={15} /> Export CSV</button>
            <button onClick={() => window.print()} type="button"><FileText size={15} /> Export PDF</button>
          </div>
        </div>
        <div className="earnings-table">
          <div className="earnings-row head"><span>Order</span><span>Customer</span><span>Fee</span><span>Date</span></div>
          {transactions.map((order) => (
            <div className="earnings-row" key={order.id}>
              <span>{order.orderNumber || order.id?.slice(0, 8)}</span>
              <span>{getCustomer(order).name}</span>
              <strong>{peso(deliveryFee(order))}</strong>
              <span>{formatShortDate(order.createdAt)}</span>
            </div>
          ))}
          {!transactions.length && <RiderEmpty icon={Wallet} title="No earnings yet" message="Completed deliveries will appear here." compact />}
        </div>
      </article>
    </section>
  );
}

function RiderProfilePage({ user, metrics, updateMyProfile, addToast }) {
  const [form, setForm] = useState(profileState(user));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setForm(profileState(user)), [user]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const ok = await updateMyProfile({
      name: form.name,
      phone: form.phone,
      address: form.address,
    });
    if (ok && user?.uid) {
      await setDoc(doc(db, 'riders', user.uid), {
        uid: user.uid,
        vehicleType: form.vehicleType,
        plateNumber: form.plateNumber,
        licenseNumber: form.licenseNumber,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, 'users', user.uid), {
        vehicleType: form.vehicleType,
        plateNumber: form.plateNumber,
        licenseNumber: form.licenseNumber,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      addToast('Rider profile updated', 'success');
    }
    setSaving(false);
  };

  const uploadFile = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `riders/${user.uid}/${type}-${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, 'users', user.uid), { [type]: url, updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'riders', user.uid), { [type]: url, updatedAt: serverTimestamp() }, { merge: true });
      addToast(type === 'profileImage' ? 'Profile photo uploaded' : 'Document uploaded', 'success');
    } catch (error) {
      addToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    addToast('Password reset email sent', 'success');
  };

  return (
    <section className="rider-portal">
      <PageHeader icon={User} title="Rider Profile" subtitle="Profile, vehicle details, documents, and security." />
      <div className="rider-profile-layout">
        <article className="rider-profile-card glass-panel">
          <div className="profile-photo-wrap">
            {user?.profileImage ? <img src={user.profileImage} alt={user.name || 'Rider'} /> : <span>{user?.name?.charAt(0) || 'R'}</span>}
            <label title="Upload profile photo">
              <ImagePlus size={16} />
              <input type="file" accept="image/*" onChange={(event) => uploadFile(event, 'profileImage')} disabled={uploading} />
            </label>
          </div>
          <h3>{user?.name || 'MotoBook Rider'}</h3>
          <p>{user?.email}</p>
          <div className="profile-score-grid">
            <span><Star size={15} /> {metrics.rating.toFixed(1)} rating</span>
            <span><CheckCircle size={15} /> {metrics.completedCount} deliveries</span>
          </div>
        </article>

        <form className="rider-profile-form glass-panel" onSubmit={submit}>
          <label>Name <input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label>
          <label>Phone <input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
          <label>Email <input value={form.email} disabled /></label>
          <label>Address <textarea value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <label>Vehicle Type <input value={form.vehicleType} onChange={(event) => update('vehicleType', event.target.value)} placeholder="Motorcycle" /></label>
          <label>Plate Number <input value={form.plateNumber} onChange={(event) => update('plateNumber', event.target.value)} /></label>
          <label>License Number <input value={form.licenseNumber} onChange={(event) => update('licenseNumber', event.target.value)} /></label>
          <div className="profile-actions-row">
            <button className="rider-action-btn primary" disabled={saving || uploading} type="submit"><BadgeCheck size={16} /> {saving ? 'Saving...' : 'Update Profile'}</button>
            <label className="rider-action-btn ghost"><Upload size={16} /> Upload Documents<input type="file" onChange={(event) => uploadFile(event, 'documentUrl')} disabled={uploading} /></label>
            <button className="rider-action-btn secondary" onClick={changePassword} type="button"><LockKeyhole size={16} /> Change Password</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function RiderNotificationsPage({ notifications, markNotificationsRead, clearNotifications }) {
  return (
    <section className="rider-portal">
      <PageHeader icon={Bell} title="Notifications" subtitle="Real-time order, payment, and admin updates." />
      <article className="rider-notifications-card glass-panel">
        <div className="card-title-row">
          <h3><Bell size={18} /> Live notifications</h3>
          <div className="earnings-actions">
            <button onClick={markNotificationsRead} type="button"><Check size={15} /> Mark Read</button>
            <button onClick={clearNotifications} type="button"><X size={15} /> Clear</button>
          </div>
        </div>
        <div className="rider-notification-list">
          {notifications.map((notification) => (
            <motion.div key={notification.id} className={notification.isRead ? '' : 'unread'} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
              <span><Bell size={16} /></span>
              <div>
                <strong>{notification.title || 'MotoBook update'}</strong>
                <p>{notification.message || 'You have a new update.'}</p>
                <small>{formatShortDate(notification.createdAt)}</small>
              </div>
            </motion.div>
          ))}
          {!notifications.length && <RiderEmpty icon={Bell} title="No notifications yet" message="New assignments and updates will arrive here instantly." compact />}
        </div>
      </article>
    </section>
  );
}

function RiderSettingsPage({ user, notificationSoundEnabled, toggleNotificationSound, updateStatus }) {
  const [language, setLanguage] = useState('English');

  return (
    <section className="rider-portal">
      <PageHeader icon={Settings} title="Rider Settings" subtitle="Availability, notifications, language, and account safety." />
      <div className="settings-grid rider-settings-grid">
        <SettingsTile icon={ShieldCheck} title="Dark Mode" value="Enabled" description="MotoBook uses the premium rider dark dashboard by default." />
        <SettingsTile icon={Bell} title="Notification Settings" value={notificationSoundEnabled ? 'Sound enabled' : 'Sound muted'}>
          <button className="rider-action-btn secondary" onClick={toggleNotificationSound} type="button">
            {notificationSoundEnabled ? 'Mute notifications' : 'Enable notifications'}
          </button>
        </SettingsTile>
        <SettingsTile icon={Power} title="Availability Settings" value={user?.riderStatus || 'online'}>
          <div className="settings-button-row">
            <button onClick={() => updateStatus('online')} type="button">Online</button>
            <button onClick={() => updateStatus('offline')} type="button">Offline</button>
          </div>
        </SettingsTile>
        <SettingsTile icon={Globe2} title="Language" value={language}>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option>English</option>
            <option>Filipino</option>
          </select>
        </SettingsTile>
      </div>
    </section>
  );
}

function SettingsTile({ icon: Icon, title, value, description, children }) {
  return (
    <article className="settings-card glass-panel">
      <h3><Icon size={18} /> {title}</h3>
      <p>{value}</p>
      {description && <small>{description}</small>}
      {children}
    </article>
  );
}

function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <header className="rider-page-header">
      <div>
        <span className="eyebrow">Rider Operations</span>
        <h2><Icon size={24} /> {title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function PerformanceChart({ title, data, valuePrefix = '' }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value || 0)));
  return (
    <article className="rider-chart-card glass-panel">
      <div className="card-title-row"><h3><BarChart3 size={18} /> {title}</h3></div>
      <div className="rider-bars">
        {data.map((item) => (
          <div key={item.label}>
            <span style={{ height: `${Math.max(8, (Number(item.value || 0) / max) * 100)}%` }} />
            <small>{item.label}</small>
            <b>{valuePrefix}{Number(item.value || 0).toLocaleString('en-PH')}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecentOrdersPanel({ orders }) {
  return (
    <article className="rider-recent-card glass-panel">
      <div className="card-title-row"><h3><Clock size={18} /> Recent Activity</h3></div>
      <div className="recent-order-list">
        {orders.map((order) => (
          <div key={order.id}>
            <span><Package size={15} /></span>
            <div><strong>{order.orderNumber || order.id?.slice(0, 8)}</strong><small>{getCustomer(order).name}</small></div>
            <StatusBadge status={normalizeStatus(order)} />
          </div>
        ))}
        {!orders.length && <p className="form-help">No rider activity yet.</p>}
      </div>
    </article>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return <span><Icon size={15} /><small>{label}</small><strong>{value}</strong></span>;
}

function StatusBadge({ status }) {
  return <span className={`rider-status-pill ${status || 'pending'}`}>{(status || 'pending').replace(/_/g, ' ')}</span>;
}

function Pagination({ page, totalPages, setPage, total }) {
  if (totalPages <= 1) return null;
  return (
    <div className="orders-pagination glass-panel">
      <span>{total} result{total === 1 ? '' : 's'} · page {page} of {totalPages}</span>
      <div>
        <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
        <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
      </div>
    </div>
  );
}

function RiderEmpty({ icon: Icon, title, message, compact = false }) {
  return (
    <div className={`rider-empty-state glass-panel ${compact ? 'compact' : ''}`}>
      <Icon size={compact ? 28 : 44} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function useRiderPresence(user, activeDelivery, addToast) {
  useEffect(() => {
    if (!user?.uid || typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    const status = activeDelivery ? 'busy_delivering' : 'online';
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'riders', user.uid), {
          uid: user.uid,
          status,
          online: true,
          currentLocation: location,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, 'users', user.uid), {
          riderStatus: status,
          isOnline: true,
          currentLocation: location,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      },
      () => addToast('GPS location permission is needed for live rider tracking', 'warning'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.uid, activeDelivery?.id, addToast]);
}

async function writeRiderActivity(uid, status, order, metrics) {
  if (!uid) return;
  const payload = {
    uid,
    status: status === 'delivered' ? 'online' : 'busy_delivering',
    online: true,
    earnings: metrics.todayEarnings,
    completedDeliveries: status === 'delivered' ? metrics.completedCount + 1 : metrics.completedCount,
    updatedAt: serverTimestamp(),
  };
  if (status === 'delivered') payload.lastDeliveredOrderId = order.id;
  await setDoc(doc(db, 'riders', uid), payload, { merge: true }).catch(() => null);
}

function buildRiderMetrics(orders, user) {
  const today = new Date().toDateString();
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const delivered = orders.filter((order) => normalizeStatus(order) === 'delivered');
  const todayDelivered = delivered.filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt) || new Date(0)).toDateString() === today);
  const weeklyDelivered = delivered.filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt)?.getTime() || 0) >= weekStart);
  const monthlyDelivered = delivered.filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt)?.getTime() || 0) >= monthStart);
  const totalFees = delivered.reduce((sum, order) => sum + deliveryFee(order), 0);

  return {
    todayDeliveries: todayDelivered.length,
    todayEarnings: todayDelivered.reduce((sum, order) => sum + deliveryFee(order), 0),
    weeklyEarnings: weeklyDelivered.reduce((sum, order) => sum + deliveryFee(order), 0),
    monthlyEarnings: monthlyDelivered.reduce((sum, order) => sum + deliveryFee(order), 0),
    completedCount: delivered.length,
    assignedCount: orders.filter((order) => ['assigned', 'accepted'].includes(normalizeStatus(order))).length,
    averageFee: delivered.length ? totalFees / delivered.length : 0,
    rating: Number(user?.rating || 4.8),
    dailySeries: lastDays(7).map((day) => ({
      label: day.label,
      value: delivered
        .filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt) || new Date(0)).toDateString() === day.date.toDateString())
        .reduce((sum, order) => sum + deliveryFee(order), 0),
    })),
    weeklySeries: lastDays(7).map((day) => ({
      label: day.label,
      value: delivered.filter((order) => (asDate(order.deliveredAt || order.updatedAt || order.createdAt) || new Date(0)).toDateString() === day.date.toDateString()).length,
    })),
  };
}

function lastDays(count) {
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }) };
  });
}

function normalizeStatus(order) {
  if (!order) return 'pending';
  const status = order.deliveryStatus || order.status || 'pending';
  if (status === 'out_for_delivery') return 'on_the_way';
  if (status === 'preparing') return 'accepted';
  return status;
}

function statusGroup(status) {
  if (status === 'assigned') return 'pending';
  if (status === 'accepted') return 'accepted';
  if (['picked_up', 'on_the_way', 'arrived'].includes(status)) return 'delivering';
  if (status === 'delivered') return 'completed';
  return 'pending';
}

function getRiderId(order) {
  return order?.riderId || (typeof order?.rider === 'string' ? order.rider : order?.rider?.id) || '';
}

function getCustomer(order) {
  const embedded = typeof order?.customer === 'object' ? order.customer : {};
  return {
    name: embedded.name || order?.customerName || 'Customer',
    phone: embedded.phone || order?.customerPhone || '',
    address: embedded.address || order?.deliveryAddress || '',
  };
}

function deliveryFee(order) {
  return Number(order?.deliveryFee ?? order?.fee ?? 49);
}

function formatDistance(distance) {
  if (!distance) return 'Calculating';
  if (typeof distance === 'number') return `${distance.toFixed(1)} km`;
  return String(distance);
}

function estimateEta(order) {
  const distance = Number(order?.distance || 0);
  if (distance > 0) return `${Math.max(12, Math.round(distance * 8))} min`;
  return '20-30 min';
}

function formatShortDate(value) {
  const date = asDate(value);
  return date ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
}

function elapsedTime(value) {
  const start = asDate(value);
  if (!start) return '00:00';
  const mins = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function mapsUrl(order) {
  const pickup = pickupLabel(order);
  const destination = dropoffLabel(order);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}`;
}

function mapsEmbedUrl(order) {
  const destination = dropoffLabel(order);
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`;
}

function pickupLabel(order) {
  if (order?.pickupLocation?.address) return order.pickupLocation.address;
  if (typeof order?.pickupLocation === 'string') return order.pickupLocation;
  return 'MotoBook Kitchen';
}

function dropoffLabel(order, customer = {}) {
  return order?.deliveryAddress || order?.address || customer.address || 'No delivery address';
}

function actionButtons(status) {
  const actions = {
    assigned: [{ status: 'accepted', label: 'Accept Order', icon: Check, tone: 'primary' }],
    accepted: [{ status: 'picked_up', label: 'Mark Picked Up', icon: Package, tone: 'secondary' }],
    picked_up: [{ status: 'on_the_way', label: 'Start Delivery', icon: Bike, tone: 'primary' }],
    on_the_way: [{ status: 'delivered', label: 'Complete Delivery', icon: CheckCircle, tone: 'success' }],
    arrived: [{ status: 'delivered', label: 'Complete Delivery', icon: CheckCircle, tone: 'success' }],
  };
  return actions[status] || [];
}

function statusUpdates(status) {
  const map = {
    accepted: { status: 'preparing', acceptedAt: serverTimestamp() },
    picked_up: { status: 'out_for_delivery', pickedUpAt: serverTimestamp() },
    on_the_way: { status: 'out_for_delivery', deliveryStartedAt: serverTimestamp() },
    delivered: { status: 'delivered', deliveredAt: serverTimestamp() },
  };
  return map[status] || {};
}

function actionMessage(status) {
  return ({
    accepted: 'Order accepted. Head to pickup.',
    picked_up: 'Order picked up. Ready to deliver.',
    on_the_way: 'Delivery started. Navigate safely.',
    delivered: 'Delivery completed successfully.',
  })[status] || 'Delivery updated.';
}

function profileState(user) {
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    vehicleType: user?.vehicleType || 'Motorcycle',
    plateNumber: user?.plateNumber || '',
    licenseNumber: user?.licenseNumber || '',
  };
}
