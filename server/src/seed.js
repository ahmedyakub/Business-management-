// Seeds an admin account plus demo data. Usage: npm run seed  (add --reset to wipe existing data)
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Supplier from './models/Supplier.js';
import Expense from './models/Expense.js';
import Settings from './models/Settings.js';
import { checkLowStock } from './utils/stock.js';

async function seed() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/business_management');

  if (process.argv.includes('--reset')) {
    await mongoose.connection.db.dropDatabase();
    console.log('Database reset');
  }

  const users = [
    { name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { name: 'Store Manager', email: 'manager@example.com', password: 'manager123', role: 'manager' },
    { name: 'Cashier', email: 'cashier@example.com', password: 'cashier123', role: 'cashier' },
    { name: 'Inventory Clerk', email: 'inventory@example.com', password: 'inventory123', role: 'inventory' },
  ];
  for (const u of users) {
    if (!(await User.exists({ email: u.email }))) await User.create(u);
  }

  await Settings.get();

  if ((await Product.countDocuments()) === 0) {
    const cats = await Category.insertMany([
      { name: 'Electronics' }, { name: 'Groceries' }, { name: 'Clothing' }, { name: 'Pharmacy' }, { name: 'Building Materials' },
    ]);
    const c = Object.fromEntries(cats.map((x) => [x.name, x._id]));
    await Product.insertMany([
      { name: 'USB-C Charger 20W', sku: 'EL-001', category: c.Electronics, purchasePrice: 8, sellingPrice: 15, quantity: 40, minStock: 10 },
      { name: 'Wireless Mouse', sku: 'EL-002', category: c.Electronics, purchasePrice: 6, sellingPrice: 12.5, quantity: 4, minStock: 5 },
      { name: 'Rice 5kg', sku: 'GR-001', category: c.Groceries, unit: 'bag', purchasePrice: 7, sellingPrice: 9.5, quantity: 60, minStock: 15 },
      { name: 'Cooking Oil 1L', sku: 'GR-002', category: c.Groceries, unit: 'bottle', purchasePrice: 2.2, sellingPrice: 3.2, quantity: 80, minStock: 20 },
      { name: 'Cotton T-Shirt', sku: 'CL-001', category: c.Clothing, purchasePrice: 4, sellingPrice: 10, quantity: 25, minStock: 8 },
      { name: 'Paracetamol 500mg (20)', sku: 'PH-001', category: c.Pharmacy, unit: 'box', purchasePrice: 0.8, sellingPrice: 1.5, quantity: 3, minStock: 10 },
      { name: 'Cement 50kg', sku: 'BM-001', category: c['Building Materials'], unit: 'bag', purchasePrice: 6.5, sellingPrice: 8.75, quantity: 120, minStock: 30 },
    ]);
    await Customer.insertMany([
      { name: 'John Doe', phone: '+1 555 0101', email: 'john@example.com', address: '12 Main St' },
      { name: 'Acme Construction', phone: '+1 555 0102', email: 'orders@acme.test', address: '400 Industrial Ave' },
    ]);
    await Supplier.insertMany([
      { name: 'Global Electronics Ltd', contactPerson: 'Sara Lee', phone: '+1 555 0201' },
      { name: 'FreshFoods Wholesale', contactPerson: 'Tom Ray', phone: '+1 555 0202' },
    ]);
    const admin = await User.findOne({ email: 'admin@example.com' });
    await Expense.insertMany([
      { category: 'Rent', amount: 800, description: 'Monthly shop rent', createdBy: admin._id },
      { category: 'Utilities', amount: 120, description: 'Electricity bill', createdBy: admin._id },
    ]);
    for (const p of await Product.find()) await checkLowStock(p);
    console.log('Demo data created');
  }

  console.log('\nLogin accounts:');
  users.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email} / ${u.password}`));
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
