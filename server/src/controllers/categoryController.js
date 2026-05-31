const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { createDoc, getById, listDocs, now, updateDoc } = require('../services/firestoreService');
const { auditLog } = require('../services/auditService');

const createRules = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('image').optional().isString().isLength({ max: 900000 }),
  body('isActive').optional().isBoolean(),
];

const updateRules = [
  param('id').trim().notEmpty(),
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('image').optional().isString().isLength({ max: 900000 }),
  body('isActive').optional().isBoolean(),
];

async function ensureUniqueName(name, ignoreId = null) {
  if (!name) return;
  const existing = await listDocs('categories', (query) => query.where('nameLower', '==', name.toLowerCase()).limit(1));
  if (existing.some((category) => !category.isDeleted && category.id !== ignoreId)) throw new AppError('Category name already exists', 409);
}

const createCategory = asyncHandler(async (req, res) => {
  await ensureUniqueName(req.body.name);
  const category = await createDoc('categories', {
    name: req.body.name,
    nameLower: req.body.name.toLowerCase(),
    description: req.body.description || '',
    image: req.body.image || '',
    isActive: req.body.isActive !== false,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'create', resource: 'categories', resourceId: category.id, after: category });
  res.status(201).json({ category });
});

const listCategories = asyncHandler(async (req, res) => {
  let categories = await listDocs('categories');
  categories = categories.filter((category) => !category.isDeleted);
  if (req.user?.role !== 'admin') {
    categories = categories.filter((category) => category.isActive !== false);
  }
  categories.sort((a, b) => String(a.nameLower || a.name || '').localeCompare(String(b.nameLower || b.name || '')));
  res.json({ categories });
});

const updateCategory = asyncHandler(async (req, res) => {
  const existing = await getById('categories', req.params.id);
  if (!existing) throw new AppError('Category not found', 404);
  await ensureUniqueName(req.body.name, req.params.id);

  const payload = { ...req.body };
  if (payload.name) payload.nameLower = payload.name.toLowerCase();
  payload.updatedBy = req.user.id;
  const category = await updateDoc('categories', req.params.id, payload);
  await auditLog({ req, action: 'update', resource: 'categories', resourceId: req.params.id, before: existing, after: category });
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const existing = await getById('categories', req.params.id);
  if (!existing) throw new AppError('Category not found', 404);
  await updateDoc('categories', req.params.id, {
    isDeleted: true,
    deletedAt: now(),
    deletedBy: req.user.id,
    isActive: false,
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'archive', resource: 'categories', resourceId: req.params.id, before: existing, metadata: { softDelete: true } });
  res.status(204).send();
});

module.exports = { createRules, updateRules, createCategory, listCategories, updateCategory, deleteCategory };
