const express = require('express');
const { param } = require('express-validator');
const receipts = require('../controllers/receiptController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/:orderId', authenticate, param('orderId').trim().notEmpty(), validate, receipts.getReceipt);

module.exports = router;
