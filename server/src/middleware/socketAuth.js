const env = require('../config/env');
const { admin } = require('../config/firebase');
const { getById, publicUser } = require('../services/firestoreService');

async function resolveTokenUser(token) {
  const decoded = await admin.auth().verifyIdToken(token, true);
  const authAgeSeconds = Math.floor(Date.now() / 1000) - Number(decoded.auth_time || decoded.iat || 0);
  if (env.sessionTimeoutMinutes > 0 && authAgeSeconds > env.sessionTimeoutMinutes * 60) return null;
  const user = await getById('users', decoded.uid);
  if (!user) return null;
  return { ...user, id: decoded.uid, uid: decoded.uid, role: decoded.role || user.role || 'customer' };
}

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Unauthorized'));

    const user = await resolveTokenUser(token);
    if (!user || user.isActive === false || user.isDeleted || (user.lockedUntil && new Date(user.lockedUntil) > new Date())) return next(new Error('Unauthorized'));

    socket.user = publicUser(user);
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
}

module.exports = socketAuth;
