const SERVICE_AREA = {
  name: 'Roxas, Oriental Mindoro',
  country: 'Philippines',
  fullName: 'Roxas, Oriental Mindoro, Philippines',
  pickupName: 'MotoBook Kitchen - Roxas',
  pickupAddress: 'Roxas, Oriental Mindoro, Philippines',
  keywords: ['roxas', 'oriental mindoro'],
};

function isInServiceArea(address = '') {
  const normalized = String(address).toLowerCase();
  return SERVICE_AREA.keywords.every((keyword) => normalized.includes(keyword));
}

function normalizeServiceAreaAddress(address = '') {
  const trimmed = String(address).trim();
  if (!trimmed) return '';
  return isInServiceArea(trimmed) ? trimmed : `${trimmed}, ${SERVICE_AREA.fullName}`;
}

module.exports = {
  SERVICE_AREA,
  isInServiceArea,
  normalizeServiceAreaAddress,
};
