import Notification from '../models/Notification.js';

// Keep low-stock notifications in sync with a product's quantity:
// create/refresh one when at or below the minimum level, clear it once restocked.
export async function checkLowStock(product) {
  if (!product) return;
  if (product.quantity > product.minStock) {
    await Notification.updateMany({ type: 'low_stock', product: product._id, read: false }, { read: true });
    return;
  }
  const message =
    product.quantity <= 0
      ? `${product.name} is out of stock`
      : `${product.name} is low on stock (${product.quantity} ${product.unit} left, minimum ${product.minStock})`;
  const existing = await Notification.findOne({ type: 'low_stock', product: product._id, read: false });
  if (existing) {
    existing.message = message;
    await existing.save();
    return;
  }
  await Notification.create({ type: 'low_stock', product: product._id, message });
}
