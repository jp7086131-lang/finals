import { useCallback, useState } from 'react';
import { request } from '../api/client';

export default function useMotoBookData({ token, role, setNotice }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [productData, categoryData] = await Promise.all([
        request('/products?pageSize=100', { token }),
        request('/categories', { token }),
      ]);

      setProducts(productData.products || []);
      setCategories(categoryData.categories || []);

      try {
        const orderData = await request('/orders?pageSize=100', { token });
        setOrders(orderData.orders || []);
      } catch (error) {
        setNotice(`Orders failed to load: ${error.message}`);
      }

      if (role === 'admin') {
        const [salesData, orderAnalytics, userData, lowStockData, paymentData] = await Promise.all([
          request('/analytics/sales', { token }).catch(() => null),
          request('/analytics/orders', { token }).catch(() => null),
          request('/users?pageSize=100', { token }).catch(() => ({ users: [] })),
          request('/products/low-stock', { token }).catch(() => ({ products: [] })),
          request('/payments?pageSize=100', { token }).catch(() => ({ payments: [] })),
        ]);
        setAnalytics({ sales: salesData, orders: orderAnalytics });
        setUsers(userData.users || []);
        setLowStockProducts(lowStockData.products || []);
        setPayments(paymentData.payments || []);
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [token, role, setNotice]);

  return {
    products,
    categories,
    orders,
    users,
    payments,
    lowStockProducts,
    analytics,
    loading,
    loadData,
  };
}
