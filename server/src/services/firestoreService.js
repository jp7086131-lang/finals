const { db, admin } = require('../config/firebase');

function now() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function timestamp() {
  return new Date().toISOString();
}

function mapDoc(doc) {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getById(collection, id) {
  const snap = await db.collection(collection).doc(id).get();
  return mapDoc(snap);
}

async function createDoc(collection, data, id = null) {
  const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
  await ref.set({ ...data, createdAt: now(), updatedAt: now() });
  return getById(collection, ref.id);
}

async function updateDoc(collection, id, data) {
  const ref = db.collection(collection).doc(id);
  await ref.update({ ...data, updatedAt: now() });
  return getById(collection, id);
}

async function deleteDoc(collection, id) {
  await db.collection(collection).doc(id).delete();
}

async function listDocs(collection, applyQuery = (query) => query) {
  const snap = await applyQuery(db.collection(collection)).get();
  return snap.docs.map(mapDoc);
}

function paginationFromQuery(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function countDocs(collection, applyQuery = (query) => query) {
  const snap = await applyQuery(db.collection(collection)).count().get();
  return snap.data().count || 0;
}

async function listDocsPage(collection, queryParams = {}, applyQuery = (query) => query) {
  const { page, pageSize, offset } = paginationFromQuery(queryParams);
  const baseQuery = applyQuery(db.collection(collection));
  const [total, snap] = await Promise.all([
    countDocs(collection, applyQuery),
    baseQuery.offset(offset).limit(pageSize).get(),
  ]);

  return {
    rows: snap.docs.map(mapDoc),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function publicUser(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  return clone;
}

module.exports = {
  db,
  admin,
  now,
  timestamp,
  mapDoc,
  getById,
  createDoc,
  updateDoc,
  deleteDoc,
  listDocs,
  listDocsPage,
  countDocs,
  paginationFromQuery,
  publicUser,
};
