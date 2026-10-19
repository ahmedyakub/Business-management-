import mongoose from 'mongoose';

// Single-document collection holding business details printed on invoices.
const settingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: 'My Business' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    taxId: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    defaultTaxRate: { type: Number, default: 0, min: 0 },
    invoiceFooter: { type: String, default: 'Thank you for your business!' },
    lastBackupAt: { type: Date },
  },
  { timestamps: true }
);

settingsSchema.statics.get = async function getSettings() {
  return (await this.findOne()) || this.create({});
};

export default mongoose.model('Settings', settingsSchema);
