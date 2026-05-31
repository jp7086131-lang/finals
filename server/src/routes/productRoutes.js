const express = require('express');
const products = require('../controllers/productController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { productImageUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/', products.listRules, validate, products.listProducts);
router.get('/low-stock', authenticate, authorize('admin'), products.lowStock);
router.post('/', authenticate, authorize('admin'), productImageUpload, products.productRules, validate, products.createProduct);
router.put('/:id', authenticate, authorize('admin'), productImageUpload, products.updateRules, validate, products.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), products.deleteRules, validate, products.deleteProduct);

module.exports = router;
