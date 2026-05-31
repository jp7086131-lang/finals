const express = require('express');
const analytics = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/sales', analytics.sales);
router.get('/orders', analytics.orders);

module.exports = router;
