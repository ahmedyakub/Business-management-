import { useEffect, useState } from 'react';
import api, { errorMessage, tz } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BarChart, DateRange, Empty, Loading, PageHeader, StatCard } from '../components/ui.jsx';
import { monthStart, toInputDate, useMoney } from '../utils/format.js';

const TABS = [
  { id: 'profit-loss', label: 'reports.tab.pl', perm: 'reports:read' },
  { id: 'sales-summary', label: 'reports.tab.ss', perm: 'reports:read' },
  { id: 'expenses', label: 'reports.tab.ex', perm: 'reports:read' },
  { id: 'inventory-valuation', label: 'reports.tab.inv', perm: 'reports:inventory' },
];

// Expense categories are stored in English; show a translation when one exists.
const catLabel = (t, c) => {
  const key = `expenseCat.${c}`;
  const label = t(key);
  return label === key ? c : label;
};

function toCsv(rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\n');
}

function exportCsv(name, rows, columns) {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Reports() {
  const { can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const tabs = TABS.filter((t) => can(t.perm));
  const [tab, setTab] = useState(tabs[0]?.id);
  const [range, setRange] = useState({ from: monthStart(), to: toInputDate() });
  const [result, setResult] = useState(null); // { tab, data } so a tab never renders another tab's data

  useEffect(() => {
    if (!tab) return;
    api.get(`/reports/${tab}`, { params: { from: range.from || undefined, to: range.to || undefined, tz } })
      .then(({ data: d }) => setResult({ tab, data: d }))
      .catch((e) => toast(errorMessage(e), 'error'));
  }, [tab, range, toast]);

  return (
    <>
      <PageHeader title={t('nav.reports')} subtitle={t('reports.subtitle')}>
        {tab !== 'inventory-valuation' && <DateRange {...range} onChange={setRange} />}
        <button className="btn btn-light no-print" onClick={() => window.print()}>{t('common.print')}</button>
      </PageHeader>
      <div className="tabs no-print">
        {tabs.map((tb) => <button key={tb.id} className={tab === tb.id ? 'active' : ''} onClick={() => setTab(tb.id)}>{t(tb.label)}</button>)}
      </div>
      {result?.tab !== tab ? <Loading /> : (
        <>
          {tab === 'profit-loss' && <ProfitLoss d={result.data} />}
          {tab === 'sales-summary' && <SalesSummary d={result.data} />}
          {tab === 'expenses' && <ExpenseReport d={result.data} />}
          {tab === 'inventory-valuation' && <Inventory d={result.data} />}
        </>
      )}
    </>
  );
}

function ProfitLoss({ d }) {
  const money = useMoney();
  const { t } = useLang();
  return (
    <>
      <div className="stats">
        <StatCard label={t('reports.revenue')} value={money(d.revenue)} hint={t('reports.salesN', { n: d.salesCount })} />
        <StatCard label={t('reports.grossProfit')} value={money(d.grossProfit)} hint={t('reports.marginPct', { p: d.grossMargin })} />
        <StatCard label={t('reports.expenses')} value={money(d.expenses)} />
        <StatCard label={t('reports.netProfit')} value={money(d.netProfit)} tone={d.netProfit >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="card">
        <h3>{t('reports.statement')}</h3>
        <table className="statement">
          <tbody>
            <tr><td>{t('reports.grossSales')}</td><td className="right">{money(d.grossSales)}</td></tr>
            <tr><td>{t('reports.lessDiscounts')}</td><td className="right">({money(d.discounts)})</td></tr>
            <tr className="subtotal"><td>{t('reports.netRevenue')}</td><td className="right">{money(d.revenue)}</td></tr>
            <tr><td>{t('reports.lessCogs')}</td><td className="right">({money(d.costOfGoodsSold)})</td></tr>
            <tr className="subtotal"><td>{t('reports.grossProfit')}</td><td className="right">{money(d.grossProfit)}</td></tr>
            {d.expensesByCategory.map((e) => (
              <tr key={e.category}><td className="indent">{catLabel(t, e.category)}</td><td className="right">({money(e.total)})</td></tr>
            ))}
            <tr><td>{t('reports.totalOpex')}</td><td className="right">({money(d.expenses)})</td></tr>
            <tr className="grand-row"><td>{t('reports.netProfit')}</td><td className={`right ${d.netProfit < 0 ? 'text-bad' : 'text-good'}`}>{money(d.netProfit)}</td></tr>
            <tr><td className="muted">{t('reports.taxCollected')}</td><td className="right muted">{money(d.taxCollected)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function SalesSummary({ d }) {
  const money = useMoney();
  const { t } = useLang();
  return (
    <>
      <div className="stats">
        <StatCard label={t('reports.totalSales')} value={money(d.total)} hint={t('dash.transactions', { n: d.count })} />
        <StatCard label={t('reports.avgSale')} value={money(d.averageSale)} />
        <StatCard label={t('reports.collected')} value={money(d.collected)} />
        <StatCard label={t('reports.outstanding')} value={money(d.outstanding)} tone={d.outstanding > 0 ? 'warn' : 'good'} />
      </div>
      <div className="card">
        <h3>{t('reports.daily')}</h3>
        <BarChart data={d.daily} format={money} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>{t('reports.topProducts')}</h3>
            <button className="btn btn-light btn-sm" onClick={() => exportCsv('top-products', d.topProducts, [
              { key: 'name', label: t('common.product') }, { key: 'quantity', label: t('common.qty') }, { key: 'revenue', label: t('reports.revenue') }, { key: 'profit', label: t('reports.profit') },
            ])}>{t('common.exportCsv')}</button>
          </div>
          {d.topProducts.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>{t('common.product')}</th><th className="right">{t('common.qty')}</th><th className="right">{t('reports.revenue')}</th><th className="right">{t('reports.profit')}</th></tr></thead>
              <tbody>{d.topProducts.map((p) => <tr key={p.product}><td>{p.name}</td><td className="right">{p.quantity}</td><td className="right">{money(p.revenue)}</td><td className="right">{money(p.profit)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>{t('reports.byMethod')}</h3>
          {d.byPaymentMethod.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>{t('common.method')}</th><th className="right">{t('reports.salesCol')}</th><th className="right">{t('reports.collected')}</th></tr></thead>
              <tbody>{d.byPaymentMethod.map((m) => <tr key={m.method}><td>{t(`method.${m.method}`)}</td><td className="right">{m.count}</td><td className="right">{money(m.total)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function ExpenseReport({ d }) {
  const money = useMoney();
  const { t } = useLang();
  return (
    <>
      <div className="stats">
        <StatCard label={t('reports.totalExpenses')} value={money(d.total)} />
        <StatCard label={t('reports.stockPurchases')} value={money(d.purchases.total)} hint={t('party.posN', { n: d.purchases.count })} />
        <StatCard label={t('reports.paidSuppliers')} value={money(d.purchases.paid)} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>{t('reports.byCategory')}</h3>
            <button className="btn btn-light btn-sm" onClick={() => exportCsv('expenses-by-category', d.byCategory.map((c) => ({ ...c, category: catLabel(t, c.category) })), [
              { key: 'category', label: t('common.category') }, { key: 'count', label: t('reports.entries') }, { key: 'total', label: t('common.total') }, { key: 'share', label: `${t('reports.share')} %` },
            ])}>{t('common.exportCsv')}</button>
          </div>
          {d.byCategory.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>{t('common.category')}</th><th className="right">{t('reports.entries')}</th><th className="right">{t('common.total')}</th><th className="right">{t('reports.share')}</th></tr></thead>
              <tbody>
                {d.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td>{catLabel(t, c.category)}</td><td className="right">{c.count}</td><td className="right">{money(c.total)}</td>
                    <td className="right"><div className="share"><div style={{ width: `${c.share}%` }} /></div>{c.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>{t('reports.dailyExpenses')}</h3>
          <BarChart data={d.daily} format={money} />
        </div>
      </div>
    </>
  );
}

function Inventory({ d }) {
  const money = useMoney();
  const { t } = useLang();
  const cols = [
    { key: 'name', label: t('common.product') }, { key: 'sku', label: 'SKU' }, { key: 'category', label: t('common.category') }, { key: 'quantity', label: t('common.qty') },
    { key: 'purchasePrice', label: t('common.unitCost') }, { key: 'sellingPrice', label: t('common.unitPrice') }, { key: 'costValue', label: t('reports.costValue') }, { key: 'retailValue', label: t('reports.retailValue') },
  ];
  return (
    <>
      <div className="stats">
        <StatCard label={t('reports.valueCost')} value={money(d.totals.costValue)} hint={t('reports.unitsProducts', { u: d.totals.units, p: d.totals.products })} />
        <StatCard label={t('reports.valueRetail')} value={money(d.totals.retailValue)} />
        <StatCard label={t('reports.potentialProfit')} value={money(d.totals.potentialProfit)} tone="good" />
        <StatCard label={t('reports.lowStockProducts')} value={d.totals.lowStock} tone={d.totals.lowStock ? 'warn' : 'good'} />
      </div>
      <div className="card">
        <h3>{t('reports.byCategory')}</h3>
        <table>
          <thead><tr><th>{t('common.category')}</th><th className="right">{t('common.products')}</th><th className="right">{t('reports.units')}</th><th className="right">{t('reports.costValue')}</th><th className="right">{t('reports.retailValue')}</th></tr></thead>
          <tbody>{d.byCategory.map((c) => <tr key={c.category}><td>{c.category === 'Uncategorized' ? t('products.uncategorized') : c.category}</td><td className="right">{c.products}</td><td className="right">{c.quantity}</td><td className="right">{money(c.costValue)}</td><td className="right">{money(c.retailValue)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>{t('common.products')}</h3>
          <button className="btn btn-light btn-sm" onClick={() => exportCsv('inventory-valuation', d.products, cols)}>{t('common.exportCsv')}</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{cols.map((c) => <th key={c.key} className={['name', 'sku', 'category'].includes(c.key) ? '' : 'right'}>{c.label}</th>)}</tr></thead>
            <tbody>
              {d.products.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td><td className="mono">{p.sku}</td><td>{p.category === 'Uncategorized' ? t('products.uncategorized') : p.category}</td>
                  <td className={`right ${p.isLowStock ? 'text-warn' : ''}`}>{p.quantity} {p.unit}</td>
                  <td className="right">{money(p.purchasePrice)}</td><td className="right">{money(p.sellingPrice)}</td>
                  <td className="right">{money(p.costValue)}</td><td className="right">{money(p.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
