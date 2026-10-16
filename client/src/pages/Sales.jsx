import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DateRange, Empty, Loading, PageHeader, Status } from '../components/ui.jsx';
import { capitalize, fmtDateTime, monthStart, toInputDate, useMoney } from '../utils/format.js';

export default function Sales() {
  const { can } = useAuth();
  const toast = useToast();
  const money = useMoney();
  const navigate = useNavigate();
  const [sales, setSales] = useState(null);
  const [range, setRange] = useState({ from: monthStart(), to: toInputDate() });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/sales', { params: { from: range.from || undefined, to: range.to || undefined, status: status || undefined, search: search || undefined } })
        .then(({ data }) => setSales(data))
        .catch((e) => toast(errorMessage(e), 'error'));
    }, 250);
    return () => clearTimeout(t);
  }, [range, status, search, toast]);

  const active = (sales || []).filter((s) => s.status !== 'void');

  return (
    <>
      <PageHeader title="Sales & Invoices" subtitle={sales ? `${active.length} sales · ${money(active.reduce((s, x) => s + x.total, 0))}` : ''}>
        <input className="search" placeholder="Invoice #" value={search} onChange={(e) => setSearch(e.target.value)} />
        <DateRange {...range} onChange={setRange} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['paid', 'partial', 'unpaid', 'void'].map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
        </select>
        {can('sales:write') && <Link to="/sales/new" className="btn btn-primary">+ New Sale</Link>}
      </PageHeader>
      <div className="card">
        {!sales ? <Loading /> : sales.length === 0 ? <Empty>No sales in this period.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th>Cashier</th><th className="right">Total</th><th className="right">Due</th></tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id} className={`clickable ${s.status === 'void' ? 'inactive' : ''}`} onClick={() => navigate(`/sales/${s._id}`)}>
                    <td className="mono">{s.invoiceNumber}</td>
                    <td>{fmtDateTime(s.date)}</td>
                    <td>{s.customer?.name || 'Walk-in'}</td>
                    <td>{s.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td>{capitalize(s.paymentMethod)}</td>
                    <td><Status value={s.status} /></td>
                    <td>{s.createdBy?.name}</td>
                    <td className="right">{money(s.total)}</td>
                    <td className="right">{s.status === 'void' ? '—' : money(s.total - s.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
