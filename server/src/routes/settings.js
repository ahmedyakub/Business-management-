import { Router } from 'express';
import Settings from '../models/Settings.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', authorize('settings:read'), asyncHandler(async (req, res) => {
  res.json(await Settings.get());
}));

router.put('/', authorize('settings:write'), asyncHandler(async (req, res) => {
  const settings = await Settings.get();
  const fields = ['businessName', 'address', 'phone', 'email', 'taxId', 'currency', 'defaultTaxRate', 'invoiceFooter'];
  fields.forEach((f) => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });
  await settings.save();
  res.json(settings);
}));

export default router;
