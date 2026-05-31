const express = require('express');
const users = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/', users.listUsers);
router.post('/', users.createRules, validate, users.createUser);
router.put('/:id', users.updateRules, validate, users.updateUser);
router.put('/:id/role', users.roleRules, validate, users.updateRole);
router.put('/:id/active', users.activeRules, validate, users.setActive);
router.put('/:id/status', users.statusRules, validate, users.setStatus);
router.post('/:id/reset-password', users.resetPassword);
router.delete('/:id', users.deleteUser);

module.exports = router;
