import { Router } from 'express';
import User from '../models/User.js';
import { authorize } from '../middleware/auth.js';
import { ROLES, ROLE_PERMISSIONS } from '../config/permissions.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(authorize('users:manage'));

router.get('/roles', (req, res) => res.json(ROLES.map((r) => ({ role: r, permissions: ROLE_PERMISSIONS[r] }))));

router.get('/', asyncHandler(async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, role, active } = req.body;
  const user = await User.create({ name, email, password, role, active });
  res.status(201).json(user);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  const { name, email, password, role, active } = req.body;
  const isSelf = user._id.equals(req.user._id);
  if (isSelf && (role && role !== user.role || active === false)) {
    throw new HttpError(400, 'You cannot change your own role or disable your own account');
  }
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (password) user.password = password;
  await user.save();
  res.json(user);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (req.user._id.equals(req.params.id)) throw new HttpError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ message: 'Deleted' });
}));

export default router;
