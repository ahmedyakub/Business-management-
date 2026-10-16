import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DateRange, Empty, Loading, PageHeader, Status } from '../components/ui.jsx';
import { fmtDateTime, monthStart, toInputDate, useMoney } from '../utils/format.js';

export default function Sales() {
  const { can } = useAuth();
  const { t } = useLang();
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
      <PageHeader title={t('nav.sales')} subtitle={sales ? t('sales.subtitle', { n: active.length, total: money(active.reduce((s, x) => s + x.total, 0)) }) : ''}>
        <input className="search" placeholder={t('sales.invoiceNo')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <DateRange {...range} onChange={setRange} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('sales.allStatuses')}</option>
          {['paid', 'partial', 'unpaid', 'void'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        {can('sales:write') && <Link to="/sales/new" className="btn btn-primary">{t('dash.newSale')}</Link>}
      </PageHeader>
      <div className="card">
        {!sales ? <Loading /> : sales.length === 0 ? <Empty>{t('sales.none')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t('common.invoice')}</th><th>{t('common.date')}</th><th>{t('common.customer')}</th><th>{t('common.items')}</th><th>{t('sales.payment')}</th><th>{t('common.status')}</th><th>{t('sales.cashier')}</th><th className="right">{t('common.total')}</th><th className="right">{t('sales.due')}</th></tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id} className={`clickable ${s.status === 'void' ? 'inactive' : ''}`} onClick={() => navigate(`/sales/${s._id}`)}>
                    <td className="mono">{s.invoiceNumber}</td>
                    <td>{fmtDateTime(s.date)}</td>
                    <td>{s.customer?.name || t('common.walkIn')}</td>
                    <td>{s.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td>{t(`method.${s.paymentMethod}`)}</td>
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
