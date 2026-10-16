import PDFDocument from 'pdfkit';
import { LOCALES, translate } from '../i18n/index.js';

const money = (n, currency) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(n) || 0);
  } catch {
    return `${currency} ${(Number(n) || 0).toFixed(2)}`;
  }
};

const formatDate = (d, lang) => {
  try {
    return new Date(d).toLocaleDateString(LOCALES[lang] || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return new Date(d).toLocaleDateString('en-US');
  }
};

// Streams an A4 invoice/receipt for a sale into the given writable stream (e.g. an HTTP response),
// with labels in the requested language ('en' or 'so').
export function renderInvoicePdf(sale, settings, stream, lang = 'en') {
  const t = (key, vars) => translate(lang, key, vars);
  const doc = new PDFDocument({ size: 'A4', margin: 50, lang: LOCALES[lang] });
  doc.pipe(stream);
  const fmt = (n) => money(n, settings.currency);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(settings.businessName, 50, 50, { width: 280 });
  doc.fontSize(9).font('Helvetica').fillColor('#555');
  [settings.address, settings.phone, settings.email, settings.taxId && t('pdf.taxId', { id: settings.taxId })]
    .filter(Boolean)
    .forEach((line) => doc.text(line, { width: 280 }));

  doc.fillColor('#000').fontSize(18).font('Helvetica-Bold')
    .text(sale.status === 'void' ? t('pdf.invoiceVoid') : t('pdf.invoice'), 330, 50, { width: 215, align: 'right' });
  doc.fontSize(9).font('Helvetica')
    .text(t('pdf.invoiceNo', { n: sale.invoiceNumber }), 330, 78, { width: 215, align: 'right' })
    .text(t('pdf.date', { d: formatDate(sale.date, lang) }), { width: 215, align: 'right' })
    .text(t('pdf.status', { s: t(`status.${sale.status}`) }), { width: 215, align: 'right' });

  // Bill to
  let y = 150;
  doc.font('Helvetica-Bold').fontSize(10).text(t('pdf.billTo'), 50, y);
  doc.font('Helvetica').fontSize(9);
  if (sale.customer) {
    [sale.customer.name, sale.customer.address, sale.customer.phone, sale.customer.email].filter(Boolean).forEach((l) => doc.text(l));
  } else {
    doc.text(t('pdf.walkIn'));
  }

  // Items table
  y = 230;
  const cols = { item: 50, qty: 300, price: 360, total: 460 };
  doc.rect(50, y - 5, 495, 20).fill('#f0f0f0').fillColor('#000');
  doc.font('Helvetica-Bold').fontSize(9)
    .text(t('pdf.item'), cols.item + 5, y)
    .text(t('pdf.qty'), cols.qty, y, { width: 50, align: 'right' })
    .text(t('pdf.unitPrice'), cols.price, y, { width: 90, align: 'right' })
    .text(t('pdf.total'), cols.total, y, { width: 80, align: 'right' });
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
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 300, y, { width: 150, align: 'right' }).text(value, cols.total, y, { width: 80, align: 'right' });
    y += 16;
  };
  line(t('pdf.subtotal'), fmt(sale.subtotal));
  if (sale.discount) line(t('pdf.discount'), `-${fmt(sale.discount)}`);
  if (sale.tax) line(t('pdf.tax', { rate: sale.taxRate }), fmt(sale.tax));
  line(t('pdf.total'), fmt(sale.total), true);
  line(t('pdf.amountPaid'), fmt(sale.amountPaid));
  const due = Math.max(sale.total - sale.amountPaid, 0);
  if (due > 0 && sale.status !== 'void') line(t('pdf.balanceDue'), fmt(due), true);

  y += 10;
  doc.font('Helvetica').fontSize(9).fillColor('#555').text(t('pdf.paymentMethod', { m: t(`method.${sale.paymentMethod}`) }), 50, y);
  if (sale.createdBy?.name) doc.text(t('pdf.servedBy', { name: sale.createdBy.name }));
  if (sale.notes) doc.text(t('pdf.notes', { notes: sale.notes }));

  if (settings.invoiceFooter) {
    doc.fontSize(9).fillColor('#777').text(settings.invoiceFooter, 50, 780, { width: 495, align: 'center' });
  }
  doc.end();
}
