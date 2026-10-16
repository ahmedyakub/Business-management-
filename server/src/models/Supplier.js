import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Positive balance = business owes the supplier.
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Supplier', supplierSchema);
