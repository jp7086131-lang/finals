const express = require('express');
const orders = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.post('/', authorize('customer'), orders.createRules, validate, orders.create);
router.get('/', orders.list);
router.get('/:id', orders.getOne);
router.put('/:id/cancel', authorize('customer'), orders.cancel);
router.put('/:id/status', authorize('admin'), orders.statusRules, validate, orders.updateStatus);
router.put('/:id/assign-rider', authorize('admin'), orders.assignRules, validate, orders.assign);
router.put('/:id/delivery-status', authorize('rider'), orders.deliveryRules, validate, orders.updateDelivery);

module.exports = router;
