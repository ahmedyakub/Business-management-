import mongoose from 'mongoose';

// A payment received from a customer or paid to a supplier against their outstanding balance.
const paymentSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    partyType: { type: String, enum: ['customer', 'supplier'], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['cash', 'card', 'bank', 'mobile'], default: 'cash' },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
