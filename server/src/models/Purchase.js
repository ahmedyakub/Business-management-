import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [purchaseItemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseSchema.index({ date: -1 });

export default mongoose.model('Purchase', purchaseSchema);
