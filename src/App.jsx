import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bike, ShieldCheck, Home, ClipboardList,
  PackageSearch, Users, CreditCard, Settings, Plus, FolderTree,
  ChartNoAxesCombined, Bell, Eye, EyeOff, LogOut, Menu, X,
  Wallet, UserRound, Mail, LockKeyhole, Phone, MapPin, User
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import useMotoBookStore from './store/useMotoBookStore';
import useFirebaseAuth from './hooks/useFirebaseAuth';
import { auth } from './firebase/init';
import ToastContainer from './components/ToastContainer';
import NotificationCenter from './components/NotificationCenter';
import AdminDashboard from './components/AdminDashboard';
import RiderDashboard from './components/RiderDashboard';
import CustomerOrderFlow from './components/CustomerOrderFlow';
import { SERVICE_AREA, isInServiceArea, normalizeServiceAreaAddress, serviceAreaHint } from './config/serviceArea';
import './index.css';

const navItems = [
  ['Dashboard', 'Overview', ['admin', 'rider'], Home],
  ['Orders', 'Live Queue', ['admin', 'customer', 'rider'], ClipboardList],
  ['Products', 'Catalog', ['admin', 'customer'], PackageSearch],
  ['Categories', 'Menu Groups', ['admin'], FolderTree],
  ['Users', 'Profiles', ['admin'], Users],
  ['Riders', 'Dispatch', ['admin'], Bike],
  ['Payments', 'QR Pay', ['admin', 'customer'], CreditCard],
  ['Earnings', 'Rider Pay', ['rider'], Wallet],
  ['Profile', 'Rider Info', ['rider'], UserRound],
  ['Notifications', 'Live Alerts', ['rider'], Bell],
  ['Reports', 'Receipts', ['admin'], ChartNoAxesCombined],
  ['Audit Trail', 'System Logs', ['admin'], ShieldCheck],
  ['Settings', 'System', ['admin', 'customer', 'rider'], Settings],
];

function App() {
  const { user, isAuthenticated, loading, notice, clearNotice, unreadNotifications, orders } = useMotoBookStore();
  const { loading: authLoading, error, register, login, logout } = useFirebaseAuth();
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleNavItems = useMemo(
    () => (user?.role ? navItems.filter(([, , roles]) => roles.includes(user.role)) : []),
    [user?.role]
  );
  const navBadges = useMemo(() => ({
    Dashboard: unreadNotifications,
    Orders: orders.filter((order) => ['pending', 'unassigned'].includes(order.deliveryStatus || order.status)).length,
    Payments: orders.filter((order) => ['under_review', 'pending_verification'].includes(order.paymentStatus)).length,
  }), [orders, unreadNotifications]);

  // Set default page on login
  useEffect(() => {
    if (user?.role === 'customer') setActivePage('Orders');
    else if (user?.role === 'rider') setActivePage('Dashboard');
    else if (user?.role === 'admin') setActivePage('Dashboard');
  }, [user?.role]);

  // Auth loading screen
  if (authLoading || loading) {
    return (
      <main className="auth-shell">
        <div className="orb orb-blue" />
        <div className="orb orb-gold" />
        <section className="auth-card glass-panel">
          <div className="loading-spinner">
            <div className="spinner-ring" />
          </div>
          <h2>Loading MotoBook...</h2>
          <p>Connecting to Firebase in real time</p>
        </section>
      </main>
    );
  }

  // Landing / Auth screens
  if (!isAuthenticated) {
    return <AuthScreen onAuth={register} onLogin={login} authError={error} />;
  }

  const renderPage = () => {
    const allowedPages = roleNavItems.map(([label]) => label);
    if (!allowedPages.includes(activePage)) {
      return <ProtectedRoleScreen role={user?.role} page={activePage} />;
    }

    if (user?.role === 'admin') {
      return <AdminDashboard activePage={activePage} />;
    }
    if (user?.role === 'rider') {
      return <RiderDashboard activePage={activePage} />;
    }
    if (user?.role === 'customer') {
      return <CustomerOrderFlow activePage={activePage} />;
    }
    return <AdminDashboard activePage={activePage} />;
  };

  return (
    <div className={`app-shell role-${user?.role || 'guest'}`}>
      <div className="orb orb-blue" />
      <div className="orb orb-gold" />
      
      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">MB</span>
          <div>
            <strong>MotoBook</strong>
            <small>{user?.name || 'Operations User'}</small>
            <span className="brand-role">{user?.role || 'guest'} account</span>
          </div>
        </div>

        {user?.role === 'customer' && (
          <motion.button 
            className="new-order" 
            onClick={() => { setActivePage('Orders'); setSidebarOpen(false); }} 
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> New Order
          </motion.button>
        )}

        <nav className="nav-list" aria-label="Primary">
          {roleNavItems.map(([label, helper, , Icon]) => (
            <button
              key={label}
              className={activePage === label ? 'active' : ''}
              onClick={() => { setActivePage(label); setSidebarOpen(false); }}
              type="button"
            >
              <span className="nav-main">
                <Icon size={18} />
                <span className="nav-copy">
                  <span>{label}</span>
                  <small>{helper}</small>
                </span>
              </span>
              {navBadges[label] > 0 && <span className="nav-badge" aria-label={`${navBadges[label]} updates`}>{navBadges[label]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-head">
            <small>Signed in as</small>
            <strong>{user?.name || 'User'}</strong>
          </div>
          <button className="sidebar-logout" onClick={logout} type="button">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="main">
        <header className="top-bar glass-panel">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} type="button">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="top-bar-title">
            <h1>{activePage}</h1>
            <span className="user-role-badge">{user?.role}</span>
          </div>
          <div className="top-bar-actions">
            <NotificationCenter />
            <div className="user-chip" onClick={() => setActivePage('Settings')}>
              <span className="avatar">{user?.name?.charAt(0) || 'U'}</span>
              <span className="user-name">{user?.name?.split(' ')[0] || 'User'}</span>
            </div>
          </div>
        </header>

        {notice && (
          <motion.div 
            className="notice glass-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span>{notice}</span>
            <button onClick={clearNotice} type="button">✕</button>
          </motion.div>
        )}

        <div className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation for non-admin */}
      {user?.role !== 'admin' && (
        <nav className="bottom-nav" aria-label="Mobile primary">
          {roleNavItems.slice(0, 5).map(([label, , , Icon]) => (
            <button
              key={label}
              className={activePage === label ? 'active' : ''}
              onClick={() => setActivePage(label)}
              type="button"
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <ToastContainer />
    </div>
  );
}

function ProtectedRoleScreen({ role, page }) {
  return (
    <section className="protected-screen glass-panel">
      <ShieldCheck size={42} />
      <h2>Protected screen</h2>
      <p>{page} is not available for {role || 'this'} accounts.</p>
    </section>
  );
}

function AuthScreen({ onAuth, onLogin, authError }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', address: '', remember: true, terms: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function forgotPassword() {
    const email = form.email.trim();
    if (!email) {
      setError('Enter your email first so we can send the reset link.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset link sent. Check your email.');
    } catch (err) {
      setError(err.message || 'Unable to send reset link.');
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        if (!form.terms) {
          setError('Please accept the terms and conditions to continue.');
          setSubmitting(false);
          return;
        }
        if (!isInServiceArea(form.address)) {
          setError(serviceAreaHint());
          setSubmitting(false);
          return;
        }
        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
        const result = await onAuth({
          email: form.email.trim(),
          password: form.password,
          name: fullName,
          phone: form.phone.trim(),
          address: normalizeServiceAreaAddress(form.address),
          role: 'customer',
        });
        if (!result.success) setError(result.error || 'Registration failed');
      } else {
        const result = await onLogin({
          email: form.email.trim(),
          password: form.password,
        });
        if (!result.success) setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card glass-panel">
        <div className="auth-copy">
          <div className="auth-brand-row">
            <span className="brand-mark">MB</span>
            <div>
              <strong>MotoBook</strong>
              <small>Food ordering and delivery</small>
            </div>
          </div>
          <small className="eyebrow">Secure access</small>
          <h1>Order food, track deliveries, and manage MotoBook.</h1>
          <p>Sign in to continue, or create a customer account for fast food ordering in {SERVICE_AREA.fullName}.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="auth-form-head">
            <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create account'}</span>
            <h2>{mode === 'login' ? 'Sign in to MotoBook' : 'Start ordering today'}</h2>
            <p>{mode === 'login' ? 'Use your email and password to continue.' : 'Create your customer account in a few quick steps.'}</p>
          </div>
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} disabled={submitting}>Login</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} disabled={submitting}>Sign up</button>
          </div>

          {mode === 'register' && (
            <div className="auth-two-col">
              <AuthField icon={User} label="First Name" value={form.firstName} onChange={(value) => update('firstName', value)} disabled={submitting} required placeholder="Juan" />
              <AuthField icon={User} label="Last Name" value={form.lastName} onChange={(value) => update('lastName', value)} disabled={submitting} required placeholder="Dela Cruz" />
            </div>
          )}
          <AuthField icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => update('email', value)} disabled={submitting} required placeholder="you@example.com" />
          <label className="auth-field">
            <span>Password</span>
            <span className="password-field auth-input-shell">
              <LockKeyhole size={18} />
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} disabled={submitting} required placeholder="Enter your password" />
              <button aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((c) => !c)} type="button" disabled={submitting}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {mode === 'register' && (
            <>
              <AuthField icon={Phone} label="Phone" value={form.phone} onChange={(value) => update('phone', value)} disabled={submitting} placeholder="09XXXXXXXXX" />
              <AuthField icon={MapPin} label="Address" value={form.address} onChange={(value) => update('address', value)} onBlur={(value) => update('address', normalizeServiceAreaAddress(value))} disabled={submitting} required placeholder={`Street / barangay, ${SERVICE_AREA.fullName}`} />
              <p className="auth-area-note"><MapPin size={14} /> {serviceAreaHint()}</p>
              <label className="auth-check">
                <input type="checkbox" checked={form.terms} onChange={(e) => update('terms', e.target.checked)} disabled={submitting} required />
                <span>I agree to the Terms & Conditions and privacy policy.</span>
              </label>
            </>
          )}
          {mode === 'login' && (
            <div className="auth-row-options">
              <label className="auth-check compact">
                <input type="checkbox" checked={form.remember} onChange={(e) => update('remember', e.target.checked)} disabled={submitting} />
                <span>Remember me</span>
              </label>
              <button className="forgot-link" type="button" onClick={forgotPassword} disabled={submitting}>Forgot Password?</button>
            </div>
          )}
          {(error || authError) && <p className="form-error">{error || authError}</p>}
          <button className="primary-action" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
          <button className="auth-switch-link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={submitting}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

function AuthField({ icon: Icon, label, value, onChange, onBlur, type = 'text', disabled, required, placeholder }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <span className="auth-input-shell">
        <Icon size={18} />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onBlur?.(e.target.value)} disabled={disabled} required={required} placeholder={placeholder} />
      </span>
    </label>
  );
}

export default App;
