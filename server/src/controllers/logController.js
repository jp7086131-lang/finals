const asyncHandler = require('../utils/asyncHandler');
const { listDocsPage } = require('../services/firestoreService');

function listLogCollection(collection) {
  return asyncHandler(async (req, res) => {
    const page = await listDocsPage(collection, req.query, (query) => query.orderBy('createdAt', 'desc'));
    res.json({ logs: page.rows, pagination: page.pagination });
  });
}

module.exports = {
  auditLogs: listLogCollection('auditLogs'),
  securityLogs: listLogCollection('securityLogs'),
};
