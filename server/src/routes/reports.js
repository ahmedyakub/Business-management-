import { Router } from 'express';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, dateRange, round2 } from '../utils/http.js';

const router = Router();

export function safeTz(tz) {
  try {
    if (tz) Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

const activeSales = (query) => ({ ...dateRange(query), status: { $ne: 'void' } });

export async function salesTotals(match) {
  const [t] = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        gross: { $sum: '$subtotal' },
        discounts: { $sum: '$discount' },
        tax: { $sum: '$tax' },
        total: { $sum: '$total' },
        collected: { $sum: '$amountPaid' },
        cogs: { $sum: { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.quantity', '$$i.costPrice'] } } } } },
      },
    },
  ]);
  return t || { count: 0, gross: 0, discounts: 0, tax: 0, total: 0, collected: 0, cogs: 0 };
}

export async function expenseTotal(match) {
  const [t] = await Expense.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return t?.total || 0;
}

// Profit & Loss: revenue (net of discounts, excluding tax) - cost of goods sold - expenses.
router.get('/profit-loss', authorize('reports:read'), asyncHandler(async (req, res) => {
  const s = await salesTotals(activeSales(req.query));
  const expenseMatch = dateRange(req.query);
  const expensesByCategory = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  const expenses = expensesByCategory.reduce((sum, e) => sum + e.total, 0);
  const revenue = s.gross - s.discounts;
  const grossProfit = revenue - s.cogs;
  res.json({
    period: { from: req.query.from || null, to: req.query.to || null },
    salesCount: s.count,
    grossSales: round2(s.gross),
    discounts: round2(s.discounts),
    revenue: round2(revenue),
    taxCollected: round2(s.tax),
    costOfGoodsSold: round2(s.cogs),
    grossProfit: round2(grossProfit),
    grossMargin: revenue ? round2((grossProfit / revenue) * 100) : 0,
    expenses: round2(expenses),
    expensesByCategory: expensesByCategory.map((e) => ({ category: e._id, total: round2(e.total) })),
    netProfit: round2(grossProfit - expenses),
  });
}));

router.get('/sales-summary', authorize('reports:read'), asyncHandler(async (req, res) => {
  const match = activeSales(req.query);
  const tz = safeTz(req.query.tz);
  const [totals, daily, topProducts, byPaymentMethod, byStatus] = await Promise.all([
    salesTotals(match),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } }, count: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          profit: { $sum: { $subtract: ['$items.total', { $multiply: ['$items.quantity', '$items.costPrice'] }] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Sale.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } }, { $sort: { total: -1 } }]),
    Sale.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
  ]);
  res.json({
    count: totals.count,
    total: round2(totals.total),
    collected: round2(totals.collected),
    outstanding: round2(totals.total - totals.collected),
    averageSale: totals.count ? round2(totals.total / totals.count) : 0,
    daily: daily.map((d) => ({ date: d._id, count: d.count, total: round2(d.total) })),
    topProducts: topProducts.map((p) => ({ product: p._id, name: p.name, quantity: p.quantity, revenue: round2(p.revenue), profit: round2(p.profit) })),
    byPaymentMethod: byPaymentMethod.map((m) => ({ method: m._id, count: m.count, total: round2(m.total) })),
    byStatus: byStatus.map((m) => ({ status: m._id, count: m.count, total: round2(m.total) })),
  });
}));

router.get('/expenses', authorize('reports:read'), asyncHandler(async (req, res) => {
  const match = dateRange(req.query);
  const tz = safeTz(req.query.tz);
  const [byCategory, daily, purchases] = await Promise.all([
    Expense.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    Purchase.aggregate([{ $match: match }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } }]),
  ]);
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  res.json({
    total: round2(total),
    byCategory: byCategory.map((c) => ({ category: c._id, count: c.count, total: round2(c.total), share: total ? round2((c.total / total) * 100) : 0 })),
    daily: daily.map((d) => ({ date: d._id, total: round2(d.total) })),
    purchases: purchases[0] ? { count: purchases[0].count, total: round2(purchases[0].total), paid: round2(purchases[0].paid) } : { count: 0, total: 0, paid: 0 },
  });
}));

router.get('/inventory-valuation', authorize('reports:inventory', 'reports:read'), asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true }).populate('category', 'name').sort({ name: 1 });
  const rows = products.map((p) => ({
    _id: p._id,
    name: p.name,
    sku: p.sku,
    category: p.category?.name || 'Uncategorized',
    quantity: p.quantity,
    unit: p.unit,
    purchasePrice: p.purchasePrice,
    sellingPrice: p.sellingPrice,
    costValue: round2(p.quantity * p.purchasePrice),
    retailValue: round2(p.quantity * p.sellingPrice),
    isLowStock: p.quantity <= p.minStock,
  }));
  const byCategory = {};
  for (const r of rows) {
    const c = (byCategory[r.category] ||= { category: r.category, products: 0, quantity: 0, costValue: 0, retailValue: 0 });
    c.products += 1;
    c.quantity += r.quantity;
    c.costValue = round2(c.costValue + r.costValue);
    c.retailValue = round2(c.retailValue + r.retailValue);
  }
  const costValue = round2(rows.reduce((s, r) => s + r.costValue, 0));
  const retailValue = round2(rows.reduce((s, r) => s + r.retailValue, 0));
  res.json({
    totals: {
      products: rows.length,
      units: rows.reduce((s, r) => s + r.quantity, 0),
      costValue,
      retailValue,
      potentialProfit: round2(retailValue - costValue),
      lowStock: rows.filter((r) => r.isLowStock).length,
    },
    byCategory: Object.values(byCategory).sort((a, b) => b.costValue - a.costValue),
    products: rows,
  });
}));

export default router;
