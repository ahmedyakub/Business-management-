import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { download, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loading, Status } from '../components/ui.jsx';
import { capitalize, fmtDateTime, useMoney } from '../utils/format.js';

export default function Invoice() {
  const { id } = useParams();
  const { settings, can } = useAuth();
  const toast = useToast();
  const money = useMoney();
  const [sale, setSale] = useState(null);

  useEffect(() => {
    api.get(`/sales/${id}`).then(({ data }) => setSale(data)).catch((e) => toast(errorMessage(e), 'error'));
  }, [id, toast]);

  const voidSale = async () => {
    const reason = window.prompt('Reason for voiding this sale? Stock will be returned to inventory.');
    if (reason === null) return;
    try {
      const { data } = await api.post(`/sales/${id}/void`, { reason });
      setSale((s) => ({ ...s, status: data.status, notes: data.notes }));
      toast('Sale voided');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const pdf = () => download(`/sales/${id}/invoice.pdf`, `${sale.invoiceNumber}.pdf`).catch((e) => toast(errorMessage(e), 'error'));

  if (!sale) return <Loading />;
  const due = Math.max(sale.total - sale.amountPaid, 0);

  return (
    <>
      <div className="page-header no-print">
        <div><Link to="/sales" className="btn btn-light">← Sales</Link></div>
        <div className="actions">
          <button className="btn btn-light" onClick={() => window.print()}>🖨️ Print</button>
          <button className="btn btn-primary" onClick={pdf}>⬇️ Download PDF</button>
          {can('sales:void') && sale.status !== 'void' && <button className="btn btn-danger" onClick={voidSale}>Void sale</button>}
        </div>
      </div>

      <div className="invoice card">
        <div className="invoice-head">
          <div>
            <h2>{settings?.businessName}</h2>
            <div className="muted small">
              {[settings?.address, settings?.phone, settings?.email, settings?.taxId && `Tax ID: ${settings.taxId}`].filter(Boolean).map((l) => <div key={l}>{l}</div>)}
            </div>
          </div>
          <div className="right">
            <h2>INVOICE</h2>
            <div className="mono">{sale.invoiceNumber}</div>
            <div className="small">{fmtDateTime(sale.date)}</div>
            <Status value={sale.status} />
          </div>
        </div>

        <div className="invoice-bill">
          <strong>Bill to</strong>
          {sale.customer ? (
            <div>
              <div>{sale.customer.name}</div>
              {[sale.customer.address, sale.customer.phone, sale.customer.email].filter(Boolean).map((l) => <div key={l} className="small muted">{l}</div>)}
            </div>
          ) : <div>Walk-in customer</div>}
        </div>

        <table>
          <thead><tr><th>#</th><th>Item</th><th className="right">Qty</th><th className="right">Unit price</th><th className="right">Total</th></tr></thead>
          <tbody>
            {sale.items.map((i, idx) => (
              <tr key={`${i.product}-${idx}`}>
                <td>{idx + 1}</td>
                <td>{i.name} <span className="muted small">{i.sku}</span></td>
                <td className="right">{i.quantity}</td>
                <td className="right">{money(i.unitPrice)}</td>
                <td className="right">{money(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals invoice-totals">
          <div><span>Subtotal</span><span>{money(sale.subtotal)}</span></div>
          {sale.discount > 0 && <div><span>Discount</span><span>−{money(sale.discount)}</span></div>}
          {sale.tax > 0 && <div><span>Tax ({sale.taxRate}%)</span><span>{money(sale.tax)}</span></div>}
          <div className="grand"><span>Total</span><span>{money(sale.total)}</span></div>
          <div><span>Paid ({capitalize(sale.paymentMethod)})</span><span>{money(sale.amountPaid)}</span></div>
          {due > 0 && sale.status !== 'void' && <div className="text-bad"><span>Balance due</span><span>{money(due)}</span></div>}
        </div>

        {sale.notes && <p className="small"><strong>Notes:</strong> {sale.notes}</p>}
        {sale.createdBy?.name && <p className="small muted">Served by {sale.createdBy.name}</p>}
        {settings?.invoiceFooter && <p className="invoice-footer">{settings.invoiceFooter}</p>}
      </div>
    </>
  );
}
