import { Router } from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import { authorize } from '../middleware/auth.js';
import { hasPermission } from '../config/permissions.js';
import { asyncHandler, round2 } from '../utils/http.js';
import { expenseTotal, safeTz, salesTotals } from './reports.js';

const router = Router();

router.get('/', authorize('dashboard:read'), asyncHandler(async (req, res) => {
  const role = req.user.role;
  const tz = safeTz(req.query.tz);
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(startOfDay); weekAgo.setDate(weekAgo.getDate() - 6);
  const notVoid = { status: { $ne: 'void' } };

  const data = {};

  if (hasPermission(role, 'sales:read')) {
    const [today, month, last7, recentSales] = await Promise.all([
      salesTotals({ ...notVoid, date: { $gte: startOfDay } }),
      salesTotals({ ...notVoid, date: { $gte: startOfMonth } }),
      Sale.aggregate([
        { $match: { ...notVoid, date: { $gte: weekAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } }, total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.find().sort({ date: -1 }).limit(8).populate('customer', 'name'),
    ]);
    data.salesToday = { count: today.count, total: round2(today.total) };
    data.salesMonth = { count: month.count, total: round2(month.total) };
    data.last7Days = last7.map((d) => ({ date: d._id, total: round2(d.total), count: d.count }));
    data.recentSales = recentSales;
    if (hasPermission(role, 'reports:read')) {
      const expensesMonth = await expenseTotal({ date: { $gte: startOfMonth } });
      const grossProfit = month.gross - month.discounts - month.cogs;
      data.expensesMonth = round2(expensesMonth);
      data.profitMonth = round2(grossProfit - expensesMonth);
    }
  }

  if (hasPermission(role, 'products:read')) {
    const [productCount, lowStock] = await Promise.all([
      Product.countDocuments({ active: true }),
      Product.find({ active: true, $expr: { $lte: ['$quantity', '$minStock'] } }).sort({ quantity: 1 }).limit(10),
    ]);
    data.productCount = productCount;
    data.lowStock = lowStock;
    data.lowStockCount = await Product.countDocuments({ active: true, $expr: { $lte: ['$quantity', '$minStock'] } });
  }

  if (hasPermission(role, 'customers:read')) {
    const [r] = await Customer.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]);
    data.receivables = round2(r?.total || 0);
  }
  if (hasPermission(role, 'suppliers:read')) {
    const [p] = await Supplier.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]);
    data.payables = round2(p?.total || 0);
  }

  res.json(data);
}));

export default router;
