import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Package, MapPin, CheckCircle, Clock, User, Phone, Map as MapIcon } from 'lucide-react';
import useMotoBookStore from '../store/useMotoBookStore';

const deliverySteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'assigned', label: 'Rider Assigned', icon: User },
  { key: 'accepted', label: 'Rider Accepted', icon: Bike },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'on_the_way', label: 'On the Way', icon: MapPin },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const stepIndex = (status) => {
  const idx = deliverySteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

export default function RealTimeDeliveryTracker({ order }) {
  if (!order) return null;

  const currentStep = stepIndex(order.deliveryStatus || order.status || 'pending');
  const isDelivered = order.deliveryStatus === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <motion.div
      className="delivery-tracker glass-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="tracker-header">
        <h3>
          <Bike size={20} />
          Delivery Status
        </h3>
        <span className={`status-badge ${order.deliveryStatus || order.status}`}>
          {(order.deliveryStatus || order.status || 'pending').replace(/_/g, ' ')}
        </span>
      </div>

      {isCancelled ? (
        <div className="tracker-cancelled">
          <X size={32} />
          <p>This order has been cancelled.</p>
        </div>
      ) : (
        <div className="tracker-steps">
          {deliverySteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <motion.div
                key={step.key}
                className={`tracker-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
              >
                <div className="step-indicator">
                  <StepIcon size={16} />
                  {index < deliverySteps.length - 1 && (
                    <div className={`step-line ${isActive ? 'active' : ''}`} />
                  )}
                </div>
                <span className="step-label">{step.label}</span>
                {isCurrent && (
                  <motion.span
                    className="step-pulse"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rider Info Card */}
      {order.rider && (
        <motion.div
          className="rider-info-card"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="rider-info-header">
            <span className="rider-avatar">
              {order.rider.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'RD'}
            </span>
            <div>
              <strong>{order.rider.name || 'Assigned Rider'}</strong>
              <span className="rider-status delivering">On Delivery</span>
            </div>
          </div>
          {order.rider.phone && (
            <a href={`tel:${order.rider.phone}`} className="rider-contact">
              <Phone size={14} />
              {order.rider.phone}
            </a>
          )}
        </motion.div>
      )}

      {/* Delivery Progress Bar */}
      {!isCancelled && (
        <div className="tracker-progress-bar">
          <motion.div
            className="tracker-progress-fill"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / (deliverySteps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Delivery Timeline */}
      {order.timeline && Object.keys(order.timeline).length > 0 && (
        <div className="tracker-timeline">
          <h4>Timeline</h4>
          {Object.entries(order.timeline).map(([event, timestamp]) => (
            <div key={event} className="timeline-item">
              <span className="timeline-event">{event.replace(/_/g, ' ')}</span>
              <span className="timeline-time">
                {timestamp?.toDate ? timestamp.toDate().toLocaleTimeString() : timestamp}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Delivery */}
      {order.estimatedDelivery && (
        <div className="tracker-estimate">
          <Clock size={14} />
          <span>Estimated delivery: {order.estimatedDelivery}</span>
        </div>
      )}
    </motion.div>
  );
}

function X({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}