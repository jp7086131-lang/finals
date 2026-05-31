const express = require('express');
const categories = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', categories.listCategories);
router.post('/', authenticate, authorize('admin'), categories.createRules, validate, categories.createCategory);
router.put('/:id', authenticate, authorize('admin'), categories.updateRules, validate, categories.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categories.updateRules.slice(0, 1), validate, categories.deleteCategory);

module.exports = router;
