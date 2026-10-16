import { Router } from 'express';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, dateRange, HttpError, round2 } from '../utils/http.js';
import { nextSequence } from '../utils/counter.js';
import { checkLowStock } from '../utils/stock.js';

const router = Router();

router.get('/', authorize('purchases:read'), asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query) };
  if (req.query.supplier) filter.supplier = req.query.supplier;
  const purchases = await Purchase.find(filter).populate('supplier', 'name').populate('createdBy', 'name').sort({ date: -1 }).limit(500);
  res.json(purchases);
}));

router.get('/:id', authorize('purchases:read'), asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate('supplier').populate('createdBy', 'name');
  if (!purchase) throw new HttpError(404, 'errors.purchaseNotFound');
  res.json(purchase);
}));

// Record stock received from a supplier: increases stock and the supplier balance owed.
router.post('/', authorize('purchases:write'), asyncHandler(async (req, res) => {
  const { supplier: supplierId, items = [], amountPaid = 0, notes, date, updateCostPrice = true } = req.body;
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new HttpError(400, 'errors.supplierRequired');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'errors.purchaseNeedsItem');

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = items.map((line) => {
    const p = byId.get(String(line.product));
    const qty = Number(line.quantity);
    const cost = line.unitCost !== undefined && line.unitCost !== '' ? Number(line.unitCost) : p?.purchasePrice;
    if (!p) throw new HttpError(400, 'errors.productNotFound');
    if (!Number.isInteger(qty) || qty <= 0) throw new HttpError(400, 'errors.invalidQuantityFor', { name: p.name });
    if (!Number.isFinite(cost) || cost < 0) throw new HttpError(400, 'errors.invalidCostFor', { name: p.name });
    return { product: p._id, name: p.name, quantity: qty, unitCost: cost, total: round2(qty * cost) };
  });

  const total = round2(lines.reduce((s, l) => s + l.total, 0));
  const paid = round2(Math.min(Math.max(Number(amountPaid) || 0, 0), total));

  const purchase = await Purchase.create({
    reference: await nextSequence('purchase', 'PO'),
    date: date ? new Date(date) : new Date(),
    supplier: supplier._id,
    items: lines,
    total,
    amountPaid: paid,
    status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    notes,
    createdBy: req.user._id,
  });

  await Promise.all(lines.map((l) => {
    const update = { $inc: { quantity: l.quantity } };
    if (updateCostPrice) update.$set = { purchasePrice: l.unitCost };
    return Product.updateOne({ _id: l.product }, update);
  }));

  // Restocked products may clear their low-stock alerts.
  const restocked = await Product.find({ _id: { $in: lines.map((l) => l.product) } });
  await Promise.all(restocked.map(checkLowStock));

  if (total - paid > 0) await Supplier.updateOne({ _id: supplier._id }, { $inc: { balance: round2(total - paid) } });

  res.status(201).json(await purchase.populate('supplier', 'name'));
}));

export default router;
