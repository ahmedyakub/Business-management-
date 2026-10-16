import Category from '../models/Category.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import { dateRange, HttpError } from '../utils/http.js';
import { crudRouter } from './crud.js';

export const categoriesRouter = crudRouter(Category, {
  resource: 'categories',
  sort: { name: 1 },
  beforeDelete: async (id) => {
    if (await Product.exists({ category: id })) throw new HttpError(400, 'Category is used by products and cannot be deleted');
  },
});

export const customersRouter = crudRouter(Customer, {
  resource: 'customers',
  searchFields: ['name', 'phone', 'email'],
  sort: { name: 1 },
  readOnlyFields: ['balance'],
  beforeDelete: async (id) => {
    if (await Sale.exists({ customer: id })) throw new HttpError(400, 'Customer has sales history and cannot be deleted');
  },
});

export const suppliersRouter = crudRouter(Supplier, {
  resource: 'suppliers',
  searchFields: ['name', 'contactPerson', 'phone', 'email'],
  sort: { name: 1 },
  readOnlyFields: ['balance'],
  beforeDelete: async (id) => {
    if (await Purchase.exists({ supplier: id })) throw new HttpError(400, 'Supplier has purchase history and cannot be deleted');
  },
});

export const expensesRouter = crudRouter(Expense, {
  resource: 'expenses',
  searchFields: ['category', 'description'],
  sort: { date: -1 },
  readOnlyFields: ['createdBy'],
  populate: { path: 'createdBy', select: 'name' },
  listFilter: (query) => ({ ...dateRange(query), ...(query.category ? { category: query.category } : {}) }),
  onCreate: (data, req) => ({ ...data, createdBy: req.user._id }),
  extend: (router, { read }) => {
    router.get('/categories', read, (req, res) => res.json(EXPENSE_CATEGORIES));
  },
});
