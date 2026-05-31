import { Bell, LogOut, Search, Settings, X } from 'lucide-react';

const placeholders = {
  Orders: 'Search order, customer, status...',
  Products: 'Search product, category, price...',
  Categories: 'Search category...',
  Customers: 'Search name, email, role...',
  Riders: 'Search rider, order, status...',
  Payments: 'Search payment, provider, order...',
  Reports: 'Search reports...',
};

export default function Header({ cartCount, activePage, user, logout, onSettings, onCart, onNotify, notificationCount = 0, notificationsOpen = false, notifications = [], onOpenOrders, searchQuery, setSearchQuery }) {
  return (
    <header className="topbar glass-panel">
      <div>
        <small className="eyebrow">MotoBook Command Center</small>
        <h1>{activePage}</h1>
      </div>
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={placeholders[activePage] || 'Search current page...'}
        />
        {searchQuery && (
          <button aria-label="Clear search" onClick={() => setSearchQuery('')} type="button"><X size={15} /></button>
        )}
      </label>
      <div className="header-actions">
        <div className="notification-wrap">
          <button className={notificationCount ? 'notify-button has-unread' : 'notify-button'} aria-label="Notifications" type="button" onClick={onNotify}>
            <Bell size={18} />
            {notificationCount > 0 && <span>{notificationCount > 9 ? '9+' : notificationCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="notification-panel glass-panel">
              <div className="notification-head">
                <strong>Notifications</strong>
                <small>{notificationCount ? `${notificationCount} new` : 'All caught up'}</small>
              </div>
              <div className="notification-list">
                {notifications.map((item) => (
                  <button key={item.id} type="button" onClick={onOpenOrders}>
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    <small>{item.time}</small>
                  </button>
                ))}
                {!notifications.length && <p>No order notifications yet.</p>}
              </div>
            </div>
          )}
        </div>
        <button aria-label="Settings" type="button" onClick={onSettings}><Settings size={18} /></button>
        <button className="avatar" aria-label="Profile" type="button" onClick={onSettings}>{user.name.slice(0, 2).toUpperCase()}</button>
        <button className="cart-pill" type="button" onClick={onCart}>Cart {cartCount}</button>
        <button type="button" onClick={logout}><LogOut size={17} /> Logout</button>
      </div>
    </header>
  );
}
