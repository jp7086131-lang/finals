export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const SOCKET_BASE = API_BASE.replace('/api', '');

function assetBase() {
  const configured = API_BASE.replace('/api', '');
  if (typeof window === 'undefined') return configured;

  try {
    const url = new URL(configured);
    const currentHost = window.location.hostname;
    if (['localhost', '127.0.0.1'].includes(url.hostname) && !['localhost', '127.0.0.1'].includes(currentHost)) {
      url.hostname = currentHost;
      return url.toString().replace(/\/$/, '');
    }
  } catch (error) {
    return configured;
  }

  return configured;
}

export async function request(path, { token, ...options } = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detailMessage = Array.isArray(data.details)
      ? data.details.map((detail) => `${detail.field}: ${detail.message}`).join('; ')
      : '';
    throw new Error(detailMessage || data.message || 'Request failed');
  }

  return data;
}

export function imageUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/');
  const uploadPath = normalized.startsWith('/')
    ? normalized
    : normalized.startsWith('uploads/')
      ? `/${normalized}`
      : `/uploads/products/${normalized}`;
  return `${assetBase()}${uploadPath}`;
}
