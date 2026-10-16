import { Router } from 'express';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import { authorize } from '../middleware/auth.js';
import { hasPermission } from '../config/permissions.js';
import { asyncHandler, dateRange, HttpError, round2 } from '../utils/http.js';

const router = Router();

router.get('/', authorize('payments:read'), asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query) };
  if (req.query.partyType) filter.partyType = req.query.partyType;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  const payments = await Payment.find(filter)
    .populate('customer', 'name')
    .populate('supplier', 'name')
    .populate('sale', 'invoiceNumber')
    .populate('purchase', 'reference')
    .populate('createdBy', 'name')
    .sort({ date: -1 })
    .limit(500);
  res.json(payments);
}));

// Apply a payment to the oldest open documents first (FIFO), updating their paid amount/status.
async function allocate(Model, filter, amount) {
  let remaining = amount;
  const docs = await Model.find({ ...filter, status: { $in: ['unpaid', 'partial'] } }).sort({ date: 1 });
  for (const doc of docs) {
    if (remaining <= 0) break;
    const due = round2(doc.total - doc.amountPaid);
    const applied = Math.min(due, remaining);
    doc.amountPaid = round2(doc.amountPaid + applied);
    doc.status = doc.amountPaid >= doc.total ? 'paid' : 'partial';
    await doc.save();
    remaining = round2(remaining - applied);
  }
}

// Customer payments need payments:write; supplier payments need purchases:write.
router.post('/', authorize('payments:write', 'purchases:write'), asyncHandler(async (req, res) => {
  const { partyType, partyId, amount, method = 'cash', note, date } = req.body;
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, 'Amount must be greater than zero');

  let payment;
  if (partyType === 'customer') {
    if (!hasPermission(req.user.role, 'payments:write')) throw new HttpError(403, 'You do not have permission to record customer payments');
    const customer = await Customer.findById(partyId);
    if (!customer) throw new HttpError(404, 'Customer not found');
    if (value > round2(customer.balance)) throw new HttpError(400, `Amount exceeds outstanding balance (${round2(customer.balance)})`);
    payment = await Payment.create({ partyType, customer: customer._id, amount: value, method, note, date, createdBy: req.user._id });
    await Customer.updateOne({ _id: customer._id }, { $inc: { balance: -value } });
    await allocate(Sale, { customer: customer._id }, value);
  } else if (partyType === 'supplier') {
    if (!hasPermission(req.user.role, 'purchases:write')) throw new HttpError(403, 'You do not have permission to record supplier payments');
    const supplier = await Supplier.findById(partyId);
    if (!supplier) throw new HttpError(404, 'Supplier not found');
    if (value > round2(supplier.balance)) throw new HttpError(400, `Amount exceeds outstanding balance (${round2(supplier.balance)})`);
    payment = await Payment.create({ partyType, supplier: supplier._id, amount: value, method, note, date, createdBy: req.user._id });
    await Supplier.updateOne({ _id: supplier._id }, { $inc: { balance: -value } });
    await allocate(Purchase, { supplier: supplier._id }, value);
  } else {
    throw new HttpError(400, 'partyType must be "customer" or "supplier"');
  }
  res.status(201).json(payment);
}));

export default router;
