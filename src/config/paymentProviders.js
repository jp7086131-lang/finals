const providers = {
  gcash: {
    id: 'gcash',
    label: 'GCash',
    qrImage: process.env.REACT_APP_GCASH_QR_IMAGE || '',
    accountName: process.env.REACT_APP_GCASH_ACCOUNT_NAME || '',
    accountNumber: process.env.REACT_APP_GCASH_ACCOUNT_NUMBER || '',
    instructions: process.env.REACT_APP_GCASH_INSTRUCTIONS || 'Scan the QR code, pay the exact amount, then upload your proof.',
  },
  maya: {
    id: 'maya',
    label: 'Maya',
    qrImage: process.env.REACT_APP_MAYA_QR_IMAGE || '',
    accountName: process.env.REACT_APP_MAYA_ACCOUNT_NAME || '',
    accountNumber: process.env.REACT_APP_MAYA_ACCOUNT_NUMBER || '',
    instructions: process.env.REACT_APP_MAYA_INSTRUCTIONS || 'Scan the QR code, pay the exact amount, then upload your proof.',
  },
};

export function getPaymentProvider(provider) {
  return providers[provider] || providers.gcash;
}

export function configuredPaymentProviders() {
  return Object.values(providers);
}
