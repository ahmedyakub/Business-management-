import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authorize('notifications:read'));

router.get('/', asyncHandler(async (req, res) => {
  const filter = req.query.unread === 'true' ? { read: false } : {};
  const [items, unread] = await Promise.all([
    Notification.find(filter).populate('product', 'name sku quantity minStock unit').sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({ read: false }),
  ]);
  res.json({ items, unread });
}));

router.put('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ read: false }, { read: true });
  res.json({ message: req.t('msg.allRead') });
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(n);
}));

export default router;
