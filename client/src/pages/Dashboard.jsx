import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, tz } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BarChart, Empty, Loading, PageHeader, StatCard, Status } from '../components/ui.jsx';
import { fmtDateTime, useMoney } from '../utils/format.js';

export default function Dashboard() {
  const { user, can } = useAuth();
  const money = useMoney();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard', { params: { tz } }).then(({ data: d }) => setData(d)).catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);

  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Here's how your business is doing">
        {can('sales:write') && <Link to="/sales/new" className="btn btn-primary">+ New Sale</Link>}
      </PageHeader>

      <div className="stats">
        {data.salesToday && <StatCard label="Sales today" value={money(data.salesToday.total)} hint={`${data.salesToday.count} transactions`} />}
        {data.salesMonth && <StatCard label="Sales this month" value={money(data.salesMonth.total)} hint={`${data.salesMonth.count} transactions`} />}
        {data.expensesMonth !== undefined && <StatCard label="Expenses this month" value={money(data.expensesMonth)} />}
        {data.profitMonth !== undefined && <StatCard label="Net profit this month" value={money(data.profitMonth)} tone={data.profitMonth >= 0 ? 'good' : 'bad'} />}
        {data.productCount !== undefined && <StatCard label="Active products" value={data.productCount} />}
        {data.lowStockCount !== undefined && <StatCard label="Low-stock items" value={data.lowStockCount} tone={data.lowStockCount ? 'warn' : 'good'} />}
        {data.receivables !== undefined && <StatCard label="Receivables (customers owe)" value={money(data.receivables)} />}
        {data.payables !== undefined && <StatCard label="Payables (owed to suppliers)" value={money(data.payables)} />}
      </div>

      <div className="grid-2">
        {data.last7Days && (
          <div className="card">
            <h3>Sales — last 7 days</h3>
            <BarChart data={data.last7Days} format={money} />
          </div>
        )}
        {data.lowStock && (
          <div className="card">
            <h3>Low-stock alerts</h3>
            {data.lowStock.length === 0 ? <Empty>All products are above their minimum stock level. 🎉</Empty> : (
              <table>
                <thead><tr><th>Product</th><th className="right">In stock</th><th className="right">Min</th></tr></thead>
                <tbody>
                  {data.lowStock.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name} <span className="muted small">{p.sku}</span></td>
                      <td className={`right ${p.quantity === 0 ? 'text-bad' : 'text-warn'}`}>{p.quantity} {p.unit}</td>
                      <td className="right">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {data.recentSales && (
        <div className="card">
          <h3>Recent sales</h3>
          {data.recentSales.length === 0 ? <Empty>No sales recorded yet.</Empty> : (
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Status</th><th className="right">Total</th></tr></thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s._id}>
                    <td><Link to={`/sales/${s._id}`}>{s.invoiceNumber}</Link></td>
                    <td>{fmtDateTime(s.date)}</td>
                    <td>{s.customer?.name || 'Walk-in'}</td>
                    <td><Status value={s.status} /></td>
                    <td className="right">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
