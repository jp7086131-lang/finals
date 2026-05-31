const { body } = require('express-validator');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { admin } = require('../config/firebase');
const { createDoc, listDocs, now, publicUser, updateDoc } = require('../services/firestoreService');
const { auditLog, securityLog } = require('../services/auditService');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 }),
  body('phone').optional().trim().isLength({ max: 40 }),
  body('address').optional().trim().isLength({ max: 240 }),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

const profileRules = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim().isLength({ max: 40 }),
  body('address').optional().trim().isLength({ max: 240 }),
];

async function findUserByEmail(email) {
  const users = await listDocs('users', (query) => query.where('email', '==', email).limit(1));
  return users[0] || null;
}

const register = asyncHandler(async (req, res) => {
  const existing = await findUserByEmail(req.body.email);
  if (existing) throw new AppError('Email already registered', 409);

  const userRecord = await admin.auth().createUser({
    email: req.body.email,
    password: req.body.password,
    displayName: req.body.name,
  });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'customer' });

  const user = await createDoc('users', {
    uid: userRecord.uid,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || '',
    address: req.body.address || '',
    role: 'customer',
    isActive: true,
    lastLoginAt: null,
  }, userRecord.uid);

  const safeUser = publicUser(user);
  await securityLog({ req, actor: safeUser, event: 'register', email: safeUser.email });
  await auditLog({ req, actor: safeUser, action: 'create', resource: 'users', resourceId: user.id, after: safeUser });
  res.status(201).json({ user: safeUser });
});

const login = asyncHandler(async (req, res) => {
  await securityLog({ req, event: 'legacy_password_login_rejected', outcome: 'failure', email: req.body.email });
  throw new AppError('Password login is handled by Firebase Authentication. Use a Firebase ID token with protected API routes.', 410);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateDoc('users', req.user.id, {
    name: req.body.name,
    phone: req.body.phone || '',
    address: req.body.address || '',
  });

  res.json({ user: publicUser(user) });
});

const logout = asyncHandler(async (req, res) => {
  await securityLog({ req, actor: req.user, event: 'logout', email: req.user.email });
  res.status(204).send();
});

module.exports = { registerRules, loginRules, profileRules, register, login, me, updateMe, logout, findUserByEmail };
