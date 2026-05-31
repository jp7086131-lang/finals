import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Plus, Minus, Trash2, CreditCard, MapPin, Phone, Camera, ChevronRight, Clock, CheckCircle, AlertTriangle, Printer, Upload, QrCode, Settings, User, X } from 'lucide-react';
import useMotoBookStore from '../store/useMotoBookStore';
import RealTimeDeliveryTracker from './RealTimeDeliveryTracker';
import ReceiptPreview from './ReceiptPreview';
import { imageUrl, request } from '../api/client';
import { getPaymentProvider } from '../config/paymentProviders';
import { SERVICE_AREA, isInServiceArea, normalizeServiceAreaAddress, serviceAreaHint } from '../config/serviceArea';

export default function CustomerOrderFlow({ activePage = 'Orders' }) {
  const { products, categories, orders, user, uploadPaymentProof, addToast } = useMotoBookStore();
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    paymentMethod: 'gcash',
  });
  const [paymentFile, setPaymentFile] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeView, setActiveView] = useState(pageToCustomerView(activePage));
  const [receiptOrder, setReceiptOrder] = useState(null);

  useEffect(() => {
    setActiveView(pageToCustomerView(activePage));
  }, [activePage]);

  const myOrders = useMemo(
    () => orders.filter((o) => {
      const customerId = typeof o.customer === 'string' ? o.customer : o.customer?.id || o.customerId;
      return customerId === user?.uid;
    }),
    [orders, user?.uid]
  );

  const categoriesList = useMemo(
    () => (categories.length > 0 ? categories : [{ id: 'all', name: 'All Items' }]),
    [categories]
  );

  useEffect(() => {
    if (!activeCategory && categoriesList.length > 0) {
      setActiveCategory(categoriesList[0].id || categoriesList[0].name);
    }
  }, [activeCategory, categoriesList]);

  const filteredProducts = useMemo(() => {
    if (!activeCategory || activeCategory === 'all') return products;
    return products.filter((p) => {
      const category = typeof p.category === 'object' ? p.category.id : p.category;
      return category === activeCategory || p.categoryId === activeCategory;
    });
  }, [products, activeCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [cart]
  );

  const addToCart = (product) => {
    const available = Number(product.stockQuantity ?? 999);
    if (available <= 0) {
      addToast(`${product.name} is out of stock`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= available) {
          addToast(`Only ${available} ${product.name} available`, 'warning');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    addToast(`${product.name} added to cart`, 'success');
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    addToast('Item removed from cart', 'info');
  };

  const placeOrder = async () => {
    if (!cart.length) {
      addToast('Cart is empty', 'warning');
      return;
    }
    if (!checkoutForm.address.trim()) {
      addToast('Please enter a delivery address', 'warning');
      return;
    }
    if (!isInServiceArea(checkoutForm.address)) {
      addToast(serviceAreaHint(), 'warning');
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          product: item.id,
          quantity: item.quantity,
        })),
        deliveryAddress: normalizeServiceAreaAddress(checkoutForm.address),
        pickupLocation: {
          name: SERVICE_AREA.pickupName,
          address: SERVICE_AREA.pickupAddress,
        },
        serviceArea: SERVICE_AREA.fullName,
        paymentProvider: checkoutForm.paymentMethod === 'cod' ? 'cash_on_delivery' : checkoutForm.paymentMethod,
      };

      const data = await request('/orders', {
        token: user?.token,
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const orderId = data.order.id;

      // Upload payment proof if provided
      if (paymentFile && checkoutForm.paymentMethod !== 'cod') {
        await uploadPaymentProof(orderId, paymentFile);
      }

      setCart([]);
      setShowCheckout(false);
      setPaymentFile(null);
      setActiveView('orders');
      addToast('Order placed successfully!', 'success');
    } catch (error) {
      addToast(`Failed to place order: ${error.message}`, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const views = [
    { key: 'menu', label: 'Menu', icon: ShoppingBag },
    { key: 'cart', label: 'Cart', count: cart.length, icon: ShoppingBag },
    { key: 'orders', label: 'Orders', count: myOrders.length, icon: Clock },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <section className="customer-order-flow">
      {/* Top Navigation */}
      <div className="customer-tabs">
        {views.map((view) => (
          <button
            key={view.key}
            className={`customer-tab ${activeView === view.key ? 'active' : ''}`}
            onClick={() => setActiveView(view.key)}
            type="button"
          >
            <view.icon size={16} />
            {view.label}
            {view.count > 0 && <span className="tab-count">{view.count}</span>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="customer-menu"
          >
            {/* Categories */}
            <div className="category-strip">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id || cat.name}
                  className={`category-chip ${activeCategory === (cat.id || cat.name) ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id || cat.name)}
                  type="button"
                >
                  {cat.name || cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={48} />
                  <p>No products available</p>
                  <small>Check back later for new items</small>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    className="product-card glass-panel"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <CustomerProductImage product={product} />
                    <div className="product-info">
                      <strong>{product.name}</strong>
                      <p className="product-desc">{product.description || ''}</p>
                      <span className="product-price">₱{Number(product.price || 0).toLocaleString()}</span>
                      {Number(product.stockQuantity ?? 1) <= 0 && <small className="stock-note">Out of stock</small>}
                    </div>
                    <motion.button
                      className="add-to-cart-btn"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addToCart(product)}
                      disabled={Number(product.stockQuantity ?? 1) <= 0}
                      aria-label={`Add ${product.name} to cart`}
                      type="button"
                    >
                      <Plus size={16} />
                    </motion.button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'cart' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="customer-cart"
          >
            {cart.length === 0 ? (
              <div className="empty-state glass-panel">
                <ShoppingBag size={48} />
                <h3>Your cart is empty</h3>
                <p>Browse the menu and add items to get started</p>
                <button className="primary-btn" onClick={() => setActiveView('menu')} type="button">
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items glass-panel">
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      className="cart-item"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>₱{Number(item.price || 0).toLocaleString()}</span>
                      </div>
                      <div className="cart-item-controls">
                        <button onClick={() => updateQuantity(item.id, -1)} type="button" className="qty-btn">
                          <Minus size={14} />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} type="button" className="qty-btn">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => removeFromCart(item.id)} type="button" className="remove-btn">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="cart-summary glass-panel">
                  <div className="cart-total-row">
                    <span>Total</span>
                    <strong>₱{cartTotal.toLocaleString()}</strong>
                  </div>
                  <motion.button
                    className="primary-btn checkout-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCheckout(true)}
                    type="button"
                  >
                    Proceed to Checkout
                    <ChevronRight size={16} />
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeView === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="customer-orders"
          >
            {myOrders.length === 0 ? (
              <div className="empty-state glass-panel">
                <Clock size={48} />
                <h3>No orders yet</h3>
                <p>Place your first order to see it here</p>
                <button className="primary-btn" onClick={() => setActiveView('menu')} type="button">
                  Order Now
                </button>
              </div>
            ) : (
              myOrders.map((order) => (
                <motion.div
                  key={order.id}
                  className="order-card glass-panel"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="order-card-header">
                    <div>
                      <strong className="order-num">{order.orderNumber || 'Order'}</strong>
                      <span className="order-date">
                        {order.createdAt?.toDate ? 
                          order.createdAt.toDate().toLocaleDateString() : 
                          new Date(order.createdAt || Date.now()).toLocaleDateString()
                        }
                      </span>
                    </div>
                    <span className={`status-badge ${order.deliveryStatus || order.status}`}>
                      {(order.deliveryStatus || order.status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="order-card-body">
                    <div className="order-items-preview">
                      {(order.items || []).slice(0, 3).map((item, idx) => (
                        <span key={idx} className="order-item-tag">
                          {item.name || item.product} x{item.quantity}
                        </span>
                      ))}
                      {(order.items || []).length > 3 && (
                        <span className="order-item-tag more">+{order.items.length - 3} more</span>
                      )}
                    </div>
                    <div className="order-total">
                      <span>Total:</span>
                      <strong>₱{Number(order.total || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                  <RealTimeDeliveryTracker order={order} />
                  <PaymentTools order={order} uploadPaymentProof={uploadPaymentProof} addToast={addToast} />
                  <div className="order-card-actions">
                    <button type="button" className="admin-primary-btn" onClick={() => setReceiptOrder(order)}>
                      <Printer size={15} /> Print Receipt
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeView === 'settings' && (
          <CustomerSettings key="settings" user={user} />
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            className="checkout-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="checkout-modal glass-panel"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="checkout-header">
                <h3>Checkout</h3>
                <button onClick={() => setShowCheckout(false)} type="button" className="close-btn">
                  X
                </button>
              </div>

              <div className="checkout-form">
                <div className="service-area-note">
                  <MapPin size={15} />
                  <span>Deliveries are available only in {SERVICE_AREA.fullName}.</span>
                </div>
                <label>
                  <MapPin size={14} />
                  Delivery Address
                  <input
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                    onBlur={(e) => setCheckoutForm({ ...checkoutForm, address: normalizeServiceAreaAddress(e.target.value) })}
                    placeholder={`Street / barangay, ${SERVICE_AREA.fullName}`}
                    required
                  />
                </label>

                <label>
                  <Phone size={14} />
                  Contact Number
                  <input
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </label>

                <label>
                  <CreditCard size={14} />
                  Payment Method
                  <select
                    value={checkoutForm.paymentMethod}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                  >
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </label>

                {checkoutForm.paymentMethod !== 'cod' && (
                  <>
                    <PaymentQrPanel provider={checkoutForm.paymentMethod} total={cartTotal} />
                    <label className="file-upload">
                      <Camera size={14} />
                      Upload Payment Proof
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentFile(e.target.files[0])}
                      />
                      {paymentFile && <span className="file-name">{paymentFile.name}</span>}
                    </label>
                  </>
                )}

                <div className="checkout-summary">
                  <div className="checkout-items">
                    {cart.map((item) => (
                      <div key={item.id} className="checkout-item">
                        <span>{item.name} x{item.quantity}</span>
                        <span>₱{(Number(item.price || 0) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="checkout-total">
                    <span>Total</span>
                    <strong>₱{cartTotal.toLocaleString()}</strong>
                  </div>
                </div>

                <motion.button
                  className="primary-btn place-order-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={placeOrder}
                  disabled={placingOrder}
                  type="button"
                >
                  {placingOrder ? 'Placing Order...' : `Place Order • ₱${cartTotal.toLocaleString()}`}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReceiptModal order={receiptOrder} token={user?.token} onClose={() => setReceiptOrder(null)} />
    </section>
  );
}

function pageToCustomerView(page) {
  if (page === 'Products') return 'menu';
  if (page === 'Payments') return 'cart';
  if (page === 'Settings') return 'settings';
  return 'orders';
}

function CustomerProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  const src = product.image && !failed ? imageUrl(product.image) : '';

  useEffect(() => {
    setFailed(false);
  }, [product.image]);

  return (
    <div className="product-image">
      {src ? (
        <img src={src} alt={product.name || 'Product'} onError={() => setFailed(true)} />
      ) : (
        <div className="product-placeholder">
          <ShoppingBag size={24} />
        </div>
      )}
    </div>
  );
}

function PaymentQrPanel({ provider, total }) {
  const config = getPaymentProvider(provider);
  const label = config.label;
  const reference = `MOTOBOOK-${Date.now().toString().slice(-6)}`;

  return (
    <div className="payment-qr-panel">
      <div className="qr-code-box" aria-label={`${label} QR payment code`}>
        {config.qrImage ? (
          <img src={imageUrl(config.qrImage)} alt={`${label} QR code`} />
        ) : (
          <>
            <QrCode size={84} />
            <span>MB</span>
          </>
        )}
      </div>
      <div>
        <strong>{label} QR Payment</strong>
        <p>{config.instructions}</p>
        <div className="payment-provider-details">
          <small>Amount: PHP {Number(total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</small>
          {config.accountName && <small>Account name: {config.accountName}</small>}
          {config.accountNumber && <small>Account number: {config.accountNumber}</small>}
          <small>Reference: {reference}</small>
        </div>
      </div>
    </div>
  );
}

function PaymentTools({ order, uploadPaymentProof, addToast }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = !['verified', 'refunded', 'cod'].includes(order.paymentStatus) && order.paymentProvider !== 'cash_on_delivery';

  if (!canUpload && !order.paymentProof) return null;

  async function submitProof() {
    if (!file) {
      addToast('Choose a payment proof image first', 'warning');
      return;
    }
    setUploading(true);
    await uploadPaymentProof(order.id, file);
    setFile(null);
    setUploading(false);
  }

  return (
    <div className="payment-tools">
      {order.paymentProof && (
        <a href={imageUrl(order.paymentProof)} target="_blank" rel="noopener noreferrer" className="proof-link">
          View uploaded proof
        </a>
      )}
      {canUpload && (
        <div className="payment-upload-row">
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button type="button" className="admin-primary-btn" onClick={submitProof} disabled={uploading}>
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Confirm Payment'}
          </button>
        </div>
      )}
    </div>
  );
}

function ReceiptModal({ order, token, onClose }) {
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
    <motion.div className="checkout-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="checkout-modal glass-panel receipt-modal" initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <div className="checkout-header">
          <h3>Printable Receipt</h3>
          <button onClick={onClose} type="button" className="close-btn" aria-label="Close receipt"><X size={18} /></button>
        </div>
        {loading && <p className="form-help">Loading receipt...</p>}
        {error && <p className="form-error">{error}</p>}
        <ReceiptPreview receipt={printable} order={order} />
        <div className="receipt-actions">
          <button type="button" className="receipt-secondary-btn" onClick={onClose}>Close</button>
          <button type="button" className="admin-primary-btn" onClick={() => window.print()}>
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CustomerSettings({ user }) {
  const { updateMyProfile } = useMotoBookStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  }, [user?.name, user?.phone, user?.address]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    if (form.address && !isInServiceArea(form.address)) {
      form.address = normalizeServiceAreaAddress(form.address);
    }
    await updateMyProfile(form);
    setSaving(false);
  };

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="settings-grid">
      <div className="glass-panel settings-card">
        <h3><User size={18} /> Profile</h3>
        <form className="profile-form" onSubmit={submit}>
          <label>
            Name
            <input value={form.name} onChange={(event) => update('name', event.target.value)} disabled={saving} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => update('phone', event.target.value)} disabled={saving} />
          </label>
          <label>
            Default address
            <textarea value={form.address} onChange={(event) => update('address', event.target.value)} onBlur={(event) => update('address', normalizeServiceAreaAddress(event.target.value))} disabled={saving} placeholder={`Street / barangay, ${SERVICE_AREA.fullName}`} />
          </label>
          <p className="form-help">{serviceAreaHint()}</p>
          <small>{user?.email}</small>
          <button className="admin-primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
      <div className="glass-panel settings-card">
        <h3><CreditCard size={18} /> Payment Preferences</h3>
        <p>GCash, Maya, and Cash on Delivery are enabled.</p>
        <small>Upload proof from Checkout or the Orders screen after paying by QR.</small>
      </div>
    </motion.div>
  );
}
