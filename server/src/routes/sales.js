import { Router } from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Settings from '../models/Settings.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, dateRange, HttpError, round2 } from '../utils/http.js';
import { nextSequence } from '../utils/counter.js';
import { checkLowStock } from '../utils/stock.js';
import { renderInvoicePdf } from '../utils/invoicePdf.js';

const router = Router();

const statusFor = (total, paid) => (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid');

router.get('/', authorize('sales:read'), asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query) };
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.invoiceNumber = new RegExp(String(req.query.search).replace(/[^\w-]/g, ''), 'i');
  const sales = await Sale.find(filter)
    .populate('customer', 'name phone')
    .populate('createdBy', 'name')
    .sort({ date: -1 })
    .limit(Number(req.query.limit) || 500);
  res.json(sales);
}));

router.get('/:id', authorize('sales:read'), asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('customer').populate('createdBy', 'name');
  if (!sale) throw new HttpError(404, 'errors.saleNotFound');
  res.json(sale);
}));

router.get('/:id/invoice.pdf', authorize('sales:read'), asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('customer').populate('createdBy', 'name');
  if (!sale) throw new HttpError(404, 'errors.saleNotFound');
  const settings = await Settings.get();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sale.invoiceNumber}.pdf"`);
  renderInvoicePdf(sale, settings, res, req.lang);
}));

router.post('/', authorize('sales:write'), asyncHandler(async (req, res) => {
  const { customer: customerId, items = [], discount = 0, taxRate = 0, amountPaid, paymentMethod = 'cash', notes, date } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'errors.saleNeedsItem');

  const customer = customerId ? await Customer.findById(customerId) : null;
  if (customerId && !customer) throw new HttpError(400, 'errors.customerNotFound');

  // Merge duplicate lines and validate against current stock.
  const merged = new Map();
  for (const line of items) {
    const qty = Number(line.quantity);
    if (!line.product || !Number.isInteger(qty) || qty <= 0) throw new HttpError(400, 'errors.invalidSaleLine');
    const prev = merged.get(String(line.product));
    merged.set(String(line.product), { quantity: (prev?.quantity || 0) + qty, unitPrice: line.unitPrice ?? prev?.unitPrice });
  }
  const products = await Product.find({ _id: { $in: [...merged.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const saleItems = [];
  for (const [id, line] of merged) {
    const p = byId.get(id);
    if (!p || !p.active) throw new HttpError(400, 'errors.productsUnavailable');
    if (p.quantity < line.quantity) throw new HttpError(400, 'errors.insufficientStock', { name: p.name, available: p.quantity });
    const unitPrice = line.unitPrice !== undefined && line.unitPrice !== '' ? Number(line.unitPrice) : p.sellingPrice;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new HttpError(400, 'errors.invalidPriceFor', { name: p.name });
    saleItems.push({
      product: p._id, name: p.name, sku: p.sku, quantity: line.quantity,
      unitPrice, costPrice: p.purchasePrice, total: round2(unitPrice * line.quantity),
    });
  }

  const subtotal = round2(saleItems.reduce((s, i) => s + i.total, 0));
  const disc = round2(Math.min(Math.max(Number(discount) || 0, 0), subtotal));
  const rate = Math.max(Number(taxRate) || 0, 0);
  const tax = round2((subtotal - disc) * (rate / 100));
  const total = round2(subtotal - disc + tax);
  const paid = round2(amountPaid === undefined || amountPaid === '' ? total : Math.max(Number(amountPaid) || 0, 0));
  if (!customer && paid < total) throw new HttpError(400, 'errors.walkInMustPay');
  const appliedPaid = Math.min(paid, total);

  // Decrement stock atomically per product; roll back on failure.
  const done = [];
  try {
    for (const item of saleItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      if (!updated) throw new HttpError(409, 'errors.stockChanged', { name: item.name });
      done.push(item);
    }
  } catch (err) {
    await Promise.all(done.map((i) => Product.updateOne({ _id: i.product }, { $inc: { quantity: i.quantity } })));
    throw err;
  }

  let sale;
  try {
    sale = await Sale.create({
      invoiceNumber: await nextSequence('invoice', 'INV'),
      date: date ? new Date(date) : new Date(),
      customer: customer?._id,
      items: saleItems,
      subtotal, discount: disc, taxRate: rate, tax, total,
      amountPaid: appliedPaid,
      paymentMethod: appliedPaid < total && appliedPaid === 0 ? 'credit' : paymentMethod,
      status: statusFor(total, appliedPaid),
      notes,
      createdBy: req.user._id,
    });
  } catch (err) {
    await Promise.all(saleItems.map((i) => Product.updateOne({ _id: i.product }, { $inc: { quantity: i.quantity } })));
    throw err;
  }

  if (customer && total - appliedPaid > 0) {
    await Customer.updateOne({ _id: customer._id }, { $inc: { balance: round2(total - appliedPaid) } });
  }

  const after = await Product.find({ _id: { $in: saleItems.map((i) => i.product) } });
  await Promise.all(after.map(checkLowStock));

  res.status(201).json(await sale.populate('customer', 'name phone'));
}));

// Void a sale: restore stock and reverse any outstanding customer balance.
router.post('/:id/void', authorize('sales:void'), asyncHandler(async (req, res) => {
  // Conditional update guarantees a sale is only voided (and stock restored) once.
  const sale = await Sale.findOneAndUpdate({ _id: req.params.id, status: { $ne: 'void' } }, { $set: { status: 'void' } });
  if (!sale) throw new HttpError(400, 'errors.saleAlreadyVoid');
  await Promise.all(sale.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { quantity: i.quantity } })));
  const restored = await Product.find({ _id: { $in: sale.items.map((i) => i.product) } });
  await Promise.all(restored.map(checkLowStock));
  const due = round2(sale.total - sale.amountPaid);
  if (sale.customer && due > 0) await Customer.updateOne({ _id: sale.customer }, { $inc: { balance: -due } });
  if (req.body.reason) {
    await Sale.updateOne({ _id: sale._id }, { notes: [sale.notes, `VOID: ${req.body.reason}`].filter(Boolean).join(' | ') });
  }
  res.json(await Sale.findById(sale._id).populate('customer', 'name phone'));
}));

export default router;
