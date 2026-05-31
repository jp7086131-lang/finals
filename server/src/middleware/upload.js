const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const productUploadRoot = path.resolve(__dirname, '../../uploads/products');
const paymentUploadRoot = path.resolve(__dirname, '../../uploads/payments');
fs.mkdirSync(productUploadRoot, { recursive: true });
fs.mkdirSync(paymentUploadRoot, { recursive: true });

function makeImageUpload({ root, fallbackName, errorMessage }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, root),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeBase = path.basename(file.originalname || fallbackName, ext).replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
      cb(null, `${Date.now()}-${safeBase || fallbackName}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
        cb(new AppError(errorMessage, 422));
        return;
      }
      cb(null, true);
    },
  });
}

const productUpload = makeImageUpload({
  root: productUploadRoot,
  fallbackName: 'product',
  errorMessage: 'Product image must be JPG, PNG, WebP, or GIF',
});

const paymentUpload = makeImageUpload({
  root: paymentUploadRoot,
  fallbackName: 'payment-proof',
  errorMessage: 'Payment proof must be JPG, PNG, WebP, or GIF',
});

module.exports = {
  productImageUpload: productUpload.single('imageFile'),
  paymentProofUpload: paymentUpload.single('proofFile'),
};
