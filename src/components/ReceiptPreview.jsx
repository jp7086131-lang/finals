import { QrCode } from 'lucide-react';
import { asDate, peso } from '../utils/format';

function cleanLabel(value, fallback = 'N/A') {
  if (!value) return fallback;
  return String(value).replace(/_/g, ' ');
}

function money(value) {
  return peso(Number(value || 0));
}

function lineTotal(item) {
  const quantity = Number(item.quantity || 1);
  return Number(item.lineTotal ?? (item.price || item.unitPrice || 0) * quantity);
}

function itemUnitPrice(item) {
  return Number(item.price || item.unitPrice || 0);
}

function formatReceiptDate(value) {
  const date = asDate(value) || new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCustomer(receipt, fallbackOrder) {
  const source = receipt.customer && typeof receipt.customer === 'object' ? receipt.customer : {};
  const fallback = fallbackOrder.customer && typeof fallbackOrder.customer === 'object' ? fallbackOrder.customer : {};
  return {
    name: source.name || fallback.name || receipt.customerName || fallbackOrder.customerName || 'Customer',
    phone: source.phone || fallback.phone || receipt.customerPhone || fallbackOrder.customerPhone || '',
  };
}

function getRider(receipt, fallbackOrder) {
  const source = receipt.rider && typeof receipt.rider === 'object' ? receipt.rider : {};
  const fallback = fallbackOrder.rider && typeof fallbackOrder.rider === 'object' ? fallbackOrder.rider : {};
  return source.name || fallback.name || receipt.riderName || fallbackOrder.riderName || '';
}

function paymentStatus(receipt, fallbackOrder) {
  const method = receipt.paymentMethod || receipt.paymentProvider || fallbackOrder.paymentMethod || fallbackOrder.paymentProvider || '';
  const status = receipt.paymentStatus || fallbackOrder.paymentStatus || 'unpaid';
  if (['cod', 'cash_on_delivery'].includes(String(method).toLowerCase()) || ['cod', 'cash_on_delivery'].includes(String(status).toLowerCase())) {
    return 'cod';
  }
  if (status === 'paid') return 'paid';
  return 'unpaid';
}

export default function ReceiptPreview({ receipt, order = {} }) {
  const printable = receipt || order;
  const items = printable.items || [];
  const computedSubtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const subtotal = Number(printable.subtotal ?? computedSubtotal);
  const deliveryFee = Number(printable.deliveryFee ?? printable.fee ?? 0);
  const serviceFee = Number(printable.serviceFee ?? printable.tax ?? 0);
  const discount = Number(printable.discount ?? 0);
  const total = Number(printable.total ?? subtotal + deliveryFee + serviceFee - discount);
  const customer = getCustomer(printable, order);
  const rider = getRider(printable, order);
  const status = paymentStatus(printable, order);
  const orderId = printable.orderNumber || printable.orderId || order.orderNumber || order.id || 'N/A';
  const paymentMethod = printable.paymentMethod || printable.paymentProvider || order.paymentMethod || order.paymentProvider || status;
  const timestamp = printable.timestamp || printable.createdAt || order.createdAt || order.updatedAt;

  return (
    <section className="receipt-print-area" aria-label="Printable MotoBook receipt">
      <div className="receipt-paper-edge" aria-hidden="true" />
      <header className="receipt-head">
        <div className="receipt-brand-mark">MB</div>
        <strong>MotoBook</strong>
        <span>Restaurant Delivery POS</span>
        <b>SALES RECEIPT</b>
      </header>

      <div className="receipt-status-row">
        <span className={`receipt-status ${status}`}>{status === 'cod' ? 'COD' : status.toUpperCase()}</span>
        <span>{formatReceiptDate(timestamp)}</span>
      </div>

      <div className="receipt-meta">
        <span><small>Merchant</small><b>MotoBook Food Hub</b></span>
        <span><small>Order ID</small><b>{orderId}</b></span>
        <span><small>Payment</small><b>{cleanLabel(paymentMethod)}</b></span>
        <span><small>Customer</small><b>{customer.name}</b></span>
        {customer.phone && <span><small>Contact</small><b>{customer.phone}</b></span>}
        {rider && <span><small>Rider</small><b>{rider}</b></span>}
      </div>

      <div className="receipt-divider" />

      <div className="receipt-table" role="table" aria-label="Order item breakdown">
        <div className="receipt-table-head" role="row">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Sub</span>
        </div>
        {items.length ? items.map((item, index) => (
          <div key={`${item.product || item.name || 'item'}-${index}`} className="receipt-item" role="row">
            <span>{item.name || item.product || 'Item'}</span>
            <span>{item.quantity || 1}</span>
            <span>{money(itemUnitPrice(item))}</span>
            <strong>{money(lineTotal(item))}</strong>
          </div>
        )) : (
          <div className="receipt-item empty" role="row">
            <span>No items listed</span>
            <span>0</span>
            <span>{money(0)}</span>
            <strong>{money(0)}</strong>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      <div className="receipt-summary">
        <span><small>Subtotal</small><b>{money(subtotal)}</b></span>
        <span><small>Delivery fee</small><b>{money(deliveryFee)}</b></span>
        <span><small>Service fee</small><b>{money(serviceFee)}</b></span>
        <span><small>Discount</small><b>-{money(discount)}</b></span>
      </div>

      <div className="receipt-total">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>

      <footer className="receipt-footer">
        <div className="receipt-qr">
          <QrCode size={36} />
        </div>
        <strong>Thank you for ordering</strong>
        <span>Support: support@motobook.local</span>
        <small>Keep this receipt for payment and delivery reference.</small>
      </footer>
    </section>
  );
}
