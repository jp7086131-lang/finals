const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { db, now } = require('./firestoreService');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function blockToken(token, userId) {
  const decoded = jwt.decode(token);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.collection('tokenBlocklists').doc(hashToken(token)).set({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    createdAt: now(),
  });
}

async function isTokenBlocked(token) {
  const doc = await db.collection('tokenBlocklists').doc(hashToken(token)).get();
  if (!doc.exists) return false;

  const data = doc.data();
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    await doc.ref.delete();
    return false;
  }

  return true;
}

module.exports = { signToken, blockToken, isTokenBlocked };
