const express = require('express');
const riders = require('../controllers/riderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('rider'));
router.get('/assigned', riders.assigned);
router.get('/history', riders.history);

module.exports = router;
