import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, CheckCheck, X, Volume2, VolumeX, ShoppingBag, Bike, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import useMotoBookStore from '../store/useMotoBookStore';

const notificationIcons = {
  new_order: ShoppingBag,
  order_accepted: CheckCircle,
  order_rejected: AlertTriangle,
  rider_assigned: Bike,
  delivery_started: Bike,
  delivery_arrived: MapPin,
  delivery_delivered: CheckCircle,
  payment_verified: CreditCard,
  payment_pending: Clock,
};

function MapPin({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const {
    notifications,
    unreadNotifications,
    markNotificationsRead,
    notificationSoundEnabled,
    toggleNotificationSound,
    user,
  } = useMotoBookStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      markNotificationsRead();
    }
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={handleToggle}
        type="button"
        aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
      >
        {unreadNotifications > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unreadNotifications > 0 && (
          <motion.span
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notification-dropdown glass-panel"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notification-header">
              <h4>Notifications</h4>
              <div className="notification-actions">
                <button
                  onClick={toggleNotificationSound}
                  type="button"
                  className="action-icon"
                  title={notificationSoundEnabled ? 'Mute sounds' : 'Enable sounds'}
                >
                  {notificationSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                {unreadNotifications > 0 && (
                  <button onClick={markNotificationsRead} type="button" className="action-icon" title="Mark all read">
                    <CheckCheck size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <Bell size={32} />
                  <p>No notifications yet</p>
                  <small>Updates will appear here in real time</small>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = notificationIcons[notif.type] || Bell;
                  const timeAgo = getTimeAgo(notif.createdAt);

                  return (
                    <motion.div
                      key={notif.id}
                      className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="notif-icon">
                        <Icon size={16} />
                      </div>
                      <div className="notif-content">
                        <p className="notif-title">{notif.title}</p>
                        <p className="notif-message">{notif.message}</p>
                        <span className="notif-time">{timeAgo}</span>
                      </div>
                      {!notif.isRead && <span className="notif-unread-dot" />}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}