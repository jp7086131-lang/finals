const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { admin } = require('../config/firebase');
const { getById, listDocsPage, publicUser, updateDoc, createDoc, now } = require('../services/firestoreService');
const { auditLog, securityLog } = require('../services/auditService');

const idParam = param('id').trim().notEmpty();

const createRules = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 }),
  body('role').isIn(['admin', 'customer', 'rider']),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),
  body('avatar').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('vehicleType').optional({ checkFalsy: true }).isIn(['Motorcycle', 'Bicycle', 'Car']),
  body('plateNumber').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('isAvailable').optional().isBoolean(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
];

const updateRules = [
  idParam,
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),
  body('avatar').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('vehicleType').optional({ checkFalsy: true }).isIn(['Motorcycle', 'Bicycle', 'Car']),
  body('plateNumber').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('isAvailable').optional().isBoolean(),
  body('role').optional().isIn(['admin', 'customer', 'rider']),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
];

const roleRules = [
  idParam,
  body('role').isIn(['admin', 'customer', 'rider']),
];

const activeRules = [
  idParam,
  body('isActive').isBoolean(),
];

const statusRules = [
  idParam,
  body('status').isIn(['active', 'inactive', 'suspended']),
];

const listUsers = asyncHandler(async (req, res) => {
  const page = await listDocsPage('users', req.query, (query) => query.orderBy('createdAt', 'desc'));
  res.json({ users: page.rows.filter((user) => !user.isDeleted).map(publicUser), pagination: page.pagination });
});

const createUser = asyncHandler(async (req, res) => {
  const userRecord = await admin.auth().createUser({
    email: req.body.email,
    password: req.body.password,
    displayName: req.body.name,
    disabled: req.body.status === 'inactive' || req.body.status === 'suspended',
  });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: req.body.role });

  const user = await createDoc('users', {
    uid: userRecord.uid,
    name: req.body.name,
    fullname: req.body.name,
    email: req.body.email,
    phone: req.body.phone || '',
    address: req.body.address || '',
    avatar: req.body.avatar || '',
    vehicleType: req.body.vehicleType || '',
    plateNumber: req.body.plateNumber || '',
    isAvailable: req.body.isAvailable !== false,
    role: req.body.role,
    status: req.body.status || 'active',
    isActive: req.body.status !== 'inactive' && req.body.status !== 'suspended',
    totalOrders: 0,
    totalSpent: 0,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  }, userRecord.uid);

  await auditLog({ req, action: 'create', resource: 'users', resourceId: user.id, after: publicUser(user) });
  res.status(201).json({ user: publicUser(user) });
});

const updateUser = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);

  const payload = {
    updatedBy: req.user.id,
  };
  ['name', 'phone', 'address', 'avatar', 'role', 'status', 'vehicleType', 'plateNumber', 'isAvailable'].forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });
  if (req.body.name !== undefined) payload.fullname = req.body.name;
  if (req.body.status !== undefined) payload.isActive = req.body.status === 'active';

  if (req.body.name || req.body.status) {
    await admin.auth().updateUser(req.params.id, {
      ...(req.body.name ? { displayName: req.body.name } : {}),
      ...(req.body.status ? { disabled: req.body.status !== 'active' } : {}),
    });
  }
  if (req.body.role && req.body.role !== existing.role) {
    await admin.auth().setCustomUserClaims(req.params.id, { role: req.body.role });
  }

  const user = await updateDoc('users', req.params.id, payload);
  await auditLog({ req, action: 'update', resource: 'users', resourceId: req.params.id, before: publicUser(existing), after: publicUser(user) });
  res.json({ user: publicUser(user) });
});

const updateRole = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);

  const user = await updateDoc('users', req.params.id, { role: req.body.role, updatedBy: req.user.id });
  await admin.auth().setCustomUserClaims(req.params.id, { role: req.body.role });
  await auditLog({ req, action: 'update_role', resource: 'users', resourceId: req.params.id, before: { role: existing.role }, after: { role: user.role } });
  res.json({ user: publicUser(user) });
});

const setActive = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);

  await admin.auth().updateUser(req.params.id, { disabled: req.body.isActive === false });
  const user = await updateDoc('users', req.params.id, {
    isActive: req.body.isActive,
    status: req.body.isActive ? 'active' : 'inactive',
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'set_active', resource: 'users', resourceId: req.params.id, before: { isActive: existing.isActive, status: existing.status }, after: { isActive: user.isActive, status: user.status } });
  res.json({ user: publicUser(user) });
});

const setStatus = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);

  await admin.auth().updateUser(req.params.id, { disabled: req.body.status !== 'active' });
  const user = await updateDoc('users', req.params.id, {
    status: req.body.status,
    isActive: req.body.status === 'active',
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'set_status', resource: 'users', resourceId: req.params.id, before: { isActive: existing.isActive, status: existing.status }, after: { isActive: user.isActive, status: user.status } });
  res.json({ user: publicUser(user) });
});

const deleteUser = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);
  if (req.params.id === req.user.id) throw new AppError('You cannot delete your own account', 409);

  await admin.auth().updateUser(req.params.id, { disabled: true }).catch(() => null);
  await updateDoc('users', req.params.id, {
    isDeleted: true,
    deletedAt: now(),
    deletedBy: req.user.id,
    isActive: false,
    status: 'inactive',
    updatedBy: req.user.id,
  });
  await auditLog({ req, action: 'archive', resource: 'users', resourceId: req.params.id, before: publicUser(existing), metadata: { softDelete: true } });
  res.status(204).send();
});

const resetPassword = asyncHandler(async (req, res) => {
  const existing = await getById('users', req.params.id);
  if (!existing) throw new AppError('User not found', 404);

  const resetLink = await admin.auth().generatePasswordResetLink(existing.email);
  await updateDoc('users', req.params.id, { passwordResetRequestedAt: now(), updatedBy: req.user.id });
  await securityLog({ req, actor: req.user, event: 'password_reset_link_generated', email: existing.email, metadata: { targetUserId: req.params.id } });
  res.json({ resetLink });
});

module.exports = {
  createRules,
  updateRules,
  roleRules,
  activeRules,
  statusRules,
  listUsers,
  createUser,
  updateUser,
  updateRole,
  setActive,
  setStatus,
  deleteUser,
  resetPassword,
};
