export const SERVICE_AREA = {
  name: 'Roxas, Oriental Mindoro',
  country: 'Philippines',
  fullName: 'Roxas, Oriental Mindoro, Philippines',
  pickupName: 'MotoBook Kitchen - Roxas',
  pickupAddress: 'Roxas, Oriental Mindoro, Philippines',
  keywords: ['roxas', 'oriental mindoro'],
};

export function isInServiceArea(address = '') {
  const normalized = String(address).toLowerCase();
  return SERVICE_AREA.keywords.every((keyword) => normalized.includes(keyword));
}

export function serviceAreaHint() {
  return `Service is currently available only within ${SERVICE_AREA.fullName}.`;
}

export function normalizeServiceAreaAddress(address = '') {
  const trimmed = String(address).trim();
  if (!trimmed) return '';
  return isInServiceArea(trimmed) ? trimmed : `${trimmed}, ${SERVICE_AREA.fullName}`;
}
