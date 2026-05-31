const express = require('express');
const auth = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const loginRateLimit = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/register', auth.registerRules, validate, auth.register);
router.post('/login', loginRateLimit, auth.loginRules, validate, auth.login);
router.get('/me', authenticate, auth.me);
router.put('/me', authenticate, auth.profileRules, validate, auth.updateMe);
router.post('/logout', authenticate, auth.logout);

module.exports = router;
