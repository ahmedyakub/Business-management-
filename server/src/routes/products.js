import { Router } from 'express';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, escapeRegex, HttpError } from '../utils/http.js';
import { checkLowStock } from '../utils/stock.js';

const router = Router();

const pick = (body) => {
  const fields = ['name', 'sku', 'barcode', 'category', 'unit', 'purchasePrice', 'sellingPrice', 'quantity', 'minStock', 'description', 'active'];
  const data = {};
  fields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f]; });
  if (data.category === '') data.category = null;
  return data;
};

router.get('/', authorize('products:read'), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { barcode: rx }];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minStock'] };
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const products = await Product.find(filter).populate('category', 'name').sort({ name: 1 });
  res.json(products);
}));

router.get('/:id', authorize('products:read'), asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) throw new HttpError(404, 'Product not found');
  res.json(product);
}));

router.post('/', authorize('products:write'), asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body));
  await checkLowStock(product);
  res.status(201).json(await product.populate('category', 'name'));
}));

router.put('/:id', authorize('products:write'), asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true }).populate('category', 'name');
  if (!product) throw new HttpError(404, 'Product not found');
  await checkLowStock(product);
  res.json(product);
}));

// Manual stock adjustment (stock take, damage, returns...). Positive or negative "change".
router.post('/:id/adjust', authorize('products:write'), asyncHandler(async (req, res) => {
  const change = Number(req.body.change);
  if (!Number.isFinite(change) || change === 0) throw new HttpError(400, 'Adjustment must be a non-zero number');
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: change < 0 ? -change : 0 } },
    { $inc: { quantity: change } },
    { new: true }
  ).populate('category', 'name');
  if (!product) throw new HttpError(400, 'Product not found or adjustment would make stock negative');
  await checkLowStock(product);
  res.json(product);
}));

router.delete('/:id', authorize('products:write'), asyncHandler(async (req, res) => {
  const used = (await Sale.exists({ 'items.product': req.params.id })) || (await Purchase.exists({ 'items.product': req.params.id }));
  if (used) {
    // Keep history intact: deactivate instead of deleting.
    await Product.findByIdAndUpdate(req.params.id, { active: false });
    return res.json({ message: 'Product has transaction history and was deactivated instead of deleted' });
  }
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ message: 'Deleted' });
}));

export default router;
