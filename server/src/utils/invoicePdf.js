import PDFDocument from 'pdfkit';

const money = (n, currency) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(n) || 0);

// Streams an A4 invoice/receipt for a sale into the given writable stream (e.g. an HTTP response).
export function renderInvoicePdf(sale, settings, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);
  const cur = settings.currency;
  const fmt = (n) => money(n, cur);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(settings.businessName, 50, 50);
  doc.fontSize(9).font('Helvetica').fillColor('#555');
  [settings.address, settings.phone, settings.email, settings.taxId && `Tax ID: ${settings.taxId}`]
    .filter(Boolean)
    .forEach((line) => doc.text(line));

  doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text(sale.status === 'void' ? 'INVOICE (VOID)' : 'INVOICE', 350, 50, { width: 195, align: 'right' });
  doc.fontSize(9).font('Helvetica')
    .text(`Invoice #: ${sale.invoiceNumber}`, 350, 78, { width: 195, align: 'right' })
    .text(`Date: ${new Date(sale.date).toLocaleDateString('en-US')}`, { width: 195, align: 'right' })
    .text(`Status: ${sale.status.toUpperCase()}`, { width: 195, align: 'right' });

  // Bill to
  let y = 150;
  doc.font('Helvetica-Bold').fontSize(10).text('Bill To:', 50, y);
  doc.font('Helvetica').fontSize(9);
  if (sale.customer) {
    [sale.customer.name, sale.customer.address, sale.customer.phone, sale.customer.email].filter(Boolean).forEach((l) => doc.text(l));
  } else {
    doc.text('Walk-in Customer');
  }

  // Items table
  y = 230;
  const cols = { item: 50, qty: 300, price: 360, total: 460 };
  doc.rect(50, y - 5, 495, 20).fill('#f0f0f0').fillColor('#000');
  doc.font('Helvetica-Bold').fontSize(9)
    .text('Item', cols.item + 5, y)
    .text('Qty', cols.qty, y, { width: 50, align: 'right' })
    .text('Unit Price', cols.price, y, { width: 90, align: 'right' })
    .text('Total', cols.total, y, { width: 80, align: 'right' });
  y += 22;
  doc.font('Helvetica');
  for (const item of sale.items) {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.text(item.name, cols.item + 5, y, { width: 240 })
      .text(String(item.quantity), cols.qty, y, { width: 50, align: 'right' })
      .text(fmt(item.unitPrice), cols.price, y, { width: 90, align: 'right' })
      .text(fmt(item.total), cols.total, y, { width: 80, align: 'right' });
    y += 18;
    doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor('#e5e5e5').stroke();
  }

  // Totals
  y += 10;
  const line = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 340, y, { width: 110, align: 'right' }).text(value, cols.total, y, { width: 80, align: 'right' });
    y += 16;
  };
  line('Subtotal', fmt(sale.subtotal));
  if (sale.discount) line('Discount', `-${fmt(sale.discount)}`);
  if (sale.tax) line(`Tax (${sale.taxRate}%)`, fmt(sale.tax));
  line('Total', fmt(sale.total), true);
  line('Amount Paid', fmt(sale.amountPaid));
  const due = Math.max(sale.total - sale.amountPaid, 0);
  if (due > 0 && sale.status !== 'void') line('Balance Due', fmt(due), true);

  y += 10;
  doc.font('Helvetica').fontSize(9).fillColor('#555').text(`Payment method: ${sale.paymentMethod}`, 50, y);
  if (sale.createdBy?.name) doc.text(`Served by: ${sale.createdBy.name}`);
  if (sale.notes) doc.text(`Notes: ${sale.notes}`);

  if (settings.invoiceFooter) {
    doc.fontSize(9).fillColor('#777').text(settings.invoiceFooter, 50, 780, { width: 495, align: 'center' });
  }
  doc.end();
}
