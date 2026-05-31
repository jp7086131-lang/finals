const express = require('express');
const payments = require('../controllers/paymentController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { paymentProofUpload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);
router.post('/confirm', authorize('admin'), payments.confirmRules, validate, payments.confirm);
router.post('/reject', authorize('admin'), payments.rejectRules, validate, payments.reject);
router.post('/refund', authorize('admin'), payments.refundRules, validate, payments.refund);
router.post('/:orderId/proof', authorize('admin', 'customer'), paymentProofUpload, payments.proofRules, validate, payments.uploadProof);
router.get('/', authorize('admin'), payments.list);
router.get('/:orderId', payments.getRules, validate, payments.getByOrder);

module.exports = router;
