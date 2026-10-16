import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Transport', 'Maintenance', 'Marketing', 'Supplies', 'Taxes', 'Other',
];

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    paymentMethod: { type: String, enum: ['cash', 'card', 'bank', 'mobile'], default: 'cash' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export default mongoose.model('Expense', expenseSchema);
