import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, tz } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BarChart, Empty, Loading, PageHeader, StatCard, Status } from '../components/ui.jsx';
import { fmtDateTime, useMoney } from '../utils/format.js';

export default function Dashboard() {
  const { user, can } = useAuth();
  const { t } = useLang();
  const money = useMoney();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard', { params: { tz } }).then(({ data: d }) => setData(d)).catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);

  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title={t('dash.welcome', { name: user.name })} subtitle={t('dash.subtitle')}>
        {can('sales:write') && <Link to="/sales/new" className="btn btn-primary">{t('dash.newSale')}</Link>}
      </PageHeader>

      <div className="stats">
        {data.salesToday && <StatCard label={t('dash.salesToday')} value={money(data.salesToday.total)} hint={t('dash.transactions', { n: data.salesToday.count })} />}
        {data.salesMonth && <StatCard label={t('dash.salesMonth')} value={money(data.salesMonth.total)} hint={t('dash.transactions', { n: data.salesMonth.count })} />}
        {data.expensesMonth !== undefined && <StatCard label={t('dash.expensesMonth')} value={money(data.expensesMonth)} />}
        {data.profitMonth !== undefined && <StatCard label={t('dash.profitMonth')} value={money(data.profitMonth)} tone={data.profitMonth >= 0 ? 'good' : 'bad'} />}
        {data.productCount !== undefined && <StatCard label={t('dash.activeProducts')} value={data.productCount} />}
        {data.lowStockCount !== undefined && <StatCard label={t('dash.lowStockItems')} value={data.lowStockCount} tone={data.lowStockCount ? 'warn' : 'good'} />}
        {data.receivables !== undefined && <StatCard label={t('dash.receivables')} value={money(data.receivables)} />}
        {data.payables !== undefined && <StatCard label={t('dash.payables')} value={money(data.payables)} />}
      </div>

      <div className="grid-2">
        {data.last7Days && (
          <div className="card">
            <h3>{t('dash.last7')}</h3>
            <BarChart data={data.last7Days} format={money} />
          </div>
        )}
        {data.lowStock && (
          <div className="card">
            <h3>{t('dash.lowStockAlerts')}</h3>
            {data.lowStock.length === 0 ? <Empty>{t('dash.allGood')}</Empty> : (
              <table>
                <thead><tr><th>{t('common.product')}</th><th className="right">{t('dash.inStock')}</th><th className="right">{t('dash.min')}</th></tr></thead>
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
          <h3>{t('dash.recentSales')}</h3>
          {data.recentSales.length === 0 ? <Empty>{t('dash.noSales')}</Empty> : (
            <table>
              <thead><tr><th>{t('common.invoice')}</th><th>{t('common.date')}</th><th>{t('common.customer')}</th><th>{t('common.status')}</th><th className="right">{t('common.total')}</th></tr></thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s._id}>
                    <td><Link to={`/sales/${s._id}`}>{s.invoiceNumber}</Link></td>
                    <td>{fmtDateTime(s.date)}</td>
                    <td>{s.customer?.name || t('common.walkIn')}</td>
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
