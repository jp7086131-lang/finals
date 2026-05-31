const { db, now } = require('./firestoreService');
const logger = require('../utils/logger');

function requestMeta(req) {
  if (!req) return {};
  return {
    ip: req.ip || req.headers?.['x-forwarded-for'] || '',
    userAgent: req.get?.('user-agent') || req.headers?.['user-agent'] || '',
    method: req.method || '',
    path: req.originalUrl || req.url || '',
  };
}

async function writeLog(collection, payload) {
  try {
    if (!db?.collection) return;
    await db.collection(collection).add({
      ...payload,
      createdAt: now(),
    });
  } catch (error) {
    logger.error(`${collection}_write_failed`, { error: error.message });
  }
}

function auditLog({ req, actor = null, action, resource, resourceId = '', before = null, after = null, metadata = {} }) {
  return writeLog('auditLogs', {
    actorId: actor?.id || actor?.uid || req?.user?.id || null,
    actorRole: actor?.role || req?.user?.role || null,
    action,
    resource,
    resourceId,
    before,
    after,
    metadata,
    ...requestMeta(req),
  });
}

function securityLog({ req, actor = null, event, outcome = 'success', email = '', metadata = {} }) {
  return writeLog('securityLogs', {
    actorId: actor?.id || actor?.uid || req?.user?.id || null,
    actorRole: actor?.role || req?.user?.role || null,
    event,
    outcome,
    email,
    metadata,
    ...requestMeta(req),
  });
}

module.exports = {
  auditLog,
  securityLog,
};
