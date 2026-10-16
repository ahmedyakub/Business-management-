import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    unit: { type: String, default: 'pcs', trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 5, min: 0 },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual('isLowStock').get(function isLowStock() {
  return this.quantity <= this.minStock;
});

productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export default mongoose.model('Product', productSchema);
