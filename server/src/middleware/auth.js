const env = require('../config/env');
const { admin } = require('../config/firebase');
const AppError = require('../utils/AppError');
const { getById, publicUser } = require('../services/firestoreService');

async function resolveTokenUser(token) {
  const decoded = await admin.auth().verifyIdToken(token, true);
  const authAgeSeconds = Math.floor(Date.now() / 1000) - Number(decoded.auth_time || decoded.iat || 0);
  if (env.sessionTimeoutMinutes > 0 && authAgeSeconds > env.sessionTimeoutMinutes * 60) {
    throw new AppError('Session expired due to inactivity', 401);
  }

  const user = await getById('users', decoded.uid);
  if (!user) throw new AppError('User profile not found', 401);

  return {
    ...user,
    id: decoded.uid,
    uid: decoded.uid,
    role: decoded.role || user.role || 'customer',
    authClaims: decoded,
  };
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw new AppError('Authentication required', 401);

    const user = await resolveTokenUser(token);

    if (!user || user.isActive === false || user.isDeleted) throw new AppError('Account is not active', 401);
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) throw new AppError('Account is temporarily locked', 423);

    req.user = publicUser(user);
    req.token = token;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Invalid or expired token', 401));
  }
}

function authorize(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Forbidden: insufficient permissions', 403));
    return next();
  };
}

module.exports = { authenticate, authorize };
