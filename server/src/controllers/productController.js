const { body, param, query } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { createDoc, getById, listDocs, now, paginationFromQuery, updateDoc } = require('../services/firestoreService');
const { auditLog } = require('../services/auditService');

const productRules = [
  body('name').trim().isLength({ min: 2, max: 140 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('price').isFloat({ min: 0 }),
  body('image').optional().trim().isLength({ max: 500 }),
  body('category').trim().notEmpty(),
  body('stockQuantity').isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('prepTime').optional().trim().isLength({ max: 40 }),
  body('tags').optional().trim().isLength({ max: 180 }),
  body('discountPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('isPopular').optional().isBoolean(),
];

const updateRules = [
  param('id').trim().notEmpty(),
  body('name').optional().trim().isLength({ min: 2, max: 140 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('image').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim().notEmpty(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('prepTime').optional().trim().isLength({ max: 40 }),
  body('tags').optional().trim().isLength({ max: 180 }),
  body('discountPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('isPopular').optional().isBoolean(),
];

const deleteRules = [
  param('id').trim().notEmpty(),
];

const listRules = [
  query('category').optional().trim().notEmpty(),
  query('search').optional().trim().isLength({ max: 80 }),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
];

function productImagePath(req) {
  return req.file ? `/uploads/products/${req.file.filename}` : req.body.image || '';
}

function optionalBoolean(value) {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
}

async function attachCategory(product) {
  if (!product) return product;
  const category = product.category ? await getById('categories', product.category) : null;
  return { ...product, category: category ? { id: category.id, name: category.name } : product.category };
}

async function attachCategories(products) {
  return Promise.all(products.map(attachCategory));
}

function createdAtMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return new Date(value).getTime() || 0;
}

const createProduct = asyncHandler(async (req, res) => {
  const category = await getById('categories', req.body.category);
  if (!category) throw new AppError('Category not found', 404);

  const product = await createDoc('products', {
    name: req.body.name,
    nameLower: req.body.name.toLowerCase(),
    description: req.body.description || '',
    price: Number(req.body.price),
    image: productImagePath(req),
    category: req.body.category,
    stockQuantity: Number(req.body.stockQuantity),
    lowStockThreshold: Number(req.body.lowStockThreshold ?? 10),
    isActive: optionalBoolean(req.body.isActive) ?? true,
    prepTime: req.body.prepTime || '',
    tags: req.body.tags || '',
    discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : null,
    isPopular: optionalBoolean(req.body.isPopular) ?? false,
    soldCount: 0,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  await auditLog({ req, action: 'create', resource: 'products', resourceId: product.id, after: product });
  res.status(201).json({ product: await attachCategory(product) });
});

const listProducts = asyncHandler(async (req, res) => {
  let products = await listDocs('products');
  const { page, pageSize, offset } = paginationFromQuery(req.query);

  products = products.filter((product) => !product.isDeleted);
  if (req.user?.role !== 'admin') products = products.filter((product) => product.isActive !== false);
  if (req.query.category) products = products.filter((product) => product.category === req.query.category);

  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    products = products.filter((product) => product.nameLower?.includes(search) || product.description?.toLowerCase().includes(search));
  }

  products.sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt));
  const total = products.length;

  res.json({
    products: await attachCategories(products.slice(offset, offset + pageSize)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const existing = await getById('products', req.params.id);
  if (!existing) throw new AppError('Product not found', 404);
  if (req.body.category && !await getById('categories', req.body.category)) throw new AppError('Category not found', 404);

  const payload = { ...req.body };
  const image = productImagePath(req);
  if (image || Object.prototype.hasOwnProperty.call(req.body, 'image')) payload.image = image;
  if (payload.name) payload.nameLower = payload.name.toLowerCase();
  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.stockQuantity !== undefined) payload.stockQuantity = Number(payload.stockQuantity);
  if (payload.lowStockThreshold !== undefined) payload.lowStockThreshold = Number(payload.lowStockThreshold);
  if (payload.isActive !== undefined) payload.isActive = optionalBoolean(payload.isActive);
  if (payload.discountPrice === '') payload.discountPrice = null;
  else if (payload.discountPrice !== undefined) payload.discountPrice = Number(payload.discountPrice);
  if (payload.isPopular !== undefined) payload.isPopular = optionalBoolean(payload.isPopular);
  payload.updatedBy = req.user.id;

  const product = await updateDoc('products', req.params.id, payload);
  await auditLog({ req, action: 'update', resource: 'products', resourceId: req.params.id, before: existing, after: product });
  res.json({ product: await attachCategory(product) });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const existing = await getById('products', req.params.id);
  if (!existing) throw new AppError('Product not found', 404);
  await updateDoc('products', req.params.id, {
    isDeleted: true,
    deletedAt: now(),
    deletedBy: req.user.id,
    isActive: false,
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'archive', resource: 'products', resourceId: req.params.id, before: existing, metadata: { softDelete: true } });
  res.status(204).send();
});

const lowStock = asyncHandler(async (req, res) => {
  const products = await listDocs('products');
  const low = products.filter((product) => !product.isDeleted && Number(product.stockQuantity) <= Number(product.lowStockThreshold));
  res.json({ products: await attachCategories(low) });
});

module.exports = {
  productRules,
  updateRules,
  deleteRules,
  listRules,
  createProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  lowStock,
};
