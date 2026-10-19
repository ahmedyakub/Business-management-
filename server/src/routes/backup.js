import { Router } from 'express';
import mongoose from 'mongoose';
import Settings from '../models/Settings.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const { EJSON } = mongoose.mongo.BSON;
// Mounted in app.js behind authenticate + authorize('backup:manage').
const router = Router();

// Collections included in a backup, in restore order.
export const BACKUP_COLLECTIONS = [
  'settings', 'counters', 'users', 'categories', 'products', 'customers', 'suppliers',
  'sales', 'purchases', 'expenses', 'payments', 'notifications',
];
const FORMAT = 'business-management-backup';
const VERSION = 1;

const db = () => mongoose.connection.db;

async function snapshot() {
  const collections = {};
  for (const name of BACKUP_COLLECTIONS) collections[name] = await db().collection(name).find().toArray();
  return collections;
}

async function replaceAll(collections) {
  for (const name of BACKUP_COLLECTIONS) {
    const coll = db().collection(name);
    await coll.deleteMany({});
    const docs = collections[name] || [];
    if (docs.length) await coll.insertMany(docs, { ordered: true });
  }
}

// Download every collection as one Extended JSON file (keeps ObjectIds and dates exact).
router.get('/', asyncHandler(async (req, res) => {
  const createdAt = new Date();
  const body = EJSON.stringify(
    { format: FORMAT, version: VERSION, createdAt, database: db().databaseName, collections: await snapshot() },
    { relaxed: true }
  );
  await Settings.updateOne({}, { $set: { lastBackupAt: createdAt } }, { upsert: true });
  const stamp = createdAt.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="backup-${stamp}.json"`);
  res.send(body);
}));

// Replace all data with a backup file. The current data is kept in memory and put back if anything fails.
router.post('/restore', asyncHandler(async (req, res) => {
  let data;
  try {
    data = EJSON.deserialize(req.body, { relaxed: true });
  } catch {
    throw new HttpError(400, 'errors.backupInvalid');
  }
  if (data?.format !== FORMAT || data.version !== VERSION || typeof data.collections !== 'object' || !data.collections) {
    throw new HttpError(400, 'errors.backupInvalid');
  }
  const unknown = Object.keys(data.collections).filter((c) => !BACKUP_COLLECTIONS.includes(c));
  if (unknown.length || Object.values(data.collections).some((docs) => !Array.isArray(docs))) {
    throw new HttpError(400, 'errors.backupInvalid');
  }
  const hasAdmin = (data.collections.users || []).some((u) => u.role === 'admin' && u.active !== false && u.email && u.password);
  if (!hasAdmin) throw new HttpError(400, 'errors.backupNoAdmin');

  const previous = await snapshot();
  try {
    await replaceAll(data.collections);
  } catch (err) {
    await replaceAll(previous);
    console.error('Restore failed, previous data put back:', err);
    throw new HttpError(500, 'errors.restoreFailed');
  }

  const counts = Object.fromEntries(BACKUP_COLLECTIONS.map((c) => [c, (data.collections[c] || []).length]));
  res.json({ message: req.t('msg.restored', { date: new Date(data.createdAt).toISOString().slice(0, 10) }), counts });
}));

export default router;
