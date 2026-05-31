const express = require('express');
const logs = require('../controllers/logController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/audit', logs.auditLogs);
router.get('/security', logs.securityLogs);

module.exports = router;
