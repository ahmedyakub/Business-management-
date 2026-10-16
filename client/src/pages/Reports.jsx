import { useEffect, useState } from 'react';
import api, { errorMessage, tz } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BarChart, DateRange, Empty, Loading, PageHeader, StatCard } from '../components/ui.jsx';
import { capitalize, monthStart, toInputDate, useMoney } from '../utils/format.js';

const TABS = [
  { id: 'profit-loss', label: 'Profit & Loss', perm: 'reports:read' },
  { id: 'sales-summary', label: 'Sales Summary', perm: 'reports:read' },
  { id: 'expenses', label: 'Expenses', perm: 'reports:read' },
  { id: 'inventory-valuation', label: 'Inventory Valuation', perm: 'reports:inventory' },
];

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
      <PageHeader title="Reports" subtitle="Financial and inventory performance">
        {tab !== 'inventory-valuation' && <DateRange {...range} onChange={setRange} />}
        <button className="btn btn-light no-print" onClick={() => window.print()}>🖨️ Print</button>
      </PageHeader>
      <div className="tabs no-print">
        {tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
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
  return (
    <>
      <div className="stats">
        <StatCard label="Revenue" value={money(d.revenue)} hint={`${d.salesCount} sales`} />
        <StatCard label="Gross profit" value={money(d.grossProfit)} hint={`${d.grossMargin}% margin`} />
        <StatCard label="Expenses" value={money(d.expenses)} />
        <StatCard label="Net profit" value={money(d.netProfit)} tone={d.netProfit >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="card">
        <h3>Profit &amp; Loss statement</h3>
        <table className="statement">
          <tbody>
            <tr><td>Gross sales</td><td className="right">{money(d.grossSales)}</td></tr>
            <tr><td>Less: discounts</td><td className="right">({money(d.discounts)})</td></tr>
            <tr className="subtotal"><td>Net revenue</td><td className="right">{money(d.revenue)}</td></tr>
            <tr><td>Less: cost of goods sold</td><td className="right">({money(d.costOfGoodsSold)})</td></tr>
            <tr className="subtotal"><td>Gross profit</td><td className="right">{money(d.grossProfit)}</td></tr>
            {d.expensesByCategory.map((e) => (
              <tr key={e.category}><td className="indent">{e.category}</td><td className="right">({money(e.total)})</td></tr>
            ))}
            <tr><td>Total operating expenses</td><td className="right">({money(d.expenses)})</td></tr>
            <tr className="grand-row"><td>Net profit</td><td className={`right ${d.netProfit < 0 ? 'text-bad' : 'text-good'}`}>{money(d.netProfit)}</td></tr>
            <tr><td className="muted">Tax collected (not included in revenue)</td><td className="right muted">{money(d.taxCollected)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function SalesSummary({ d }) {
  const money = useMoney();
  return (
    <>
      <div className="stats">
        <StatCard label="Total sales" value={money(d.total)} hint={`${d.count} transactions`} />
        <StatCard label="Average sale" value={money(d.averageSale)} />
        <StatCard label="Collected" value={money(d.collected)} />
        <StatCard label="Outstanding" value={money(d.outstanding)} tone={d.outstanding > 0 ? 'warn' : 'good'} />
      </div>
      <div className="card">
        <h3>Daily sales</h3>
        <BarChart data={d.daily} format={money} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Top products</h3>
            <button className="btn btn-light btn-sm" onClick={() => exportCsv('top-products', d.topProducts, [
              { key: 'name', label: 'Product' }, { key: 'quantity', label: 'Qty' }, { key: 'revenue', label: 'Revenue' }, { key: 'profit', label: 'Profit' },
            ])}>Export CSV</button>
          </div>
          {d.topProducts.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Revenue</th><th className="right">Profit</th></tr></thead>
              <tbody>{d.topProducts.map((p) => <tr key={p.product}><td>{p.name}</td><td className="right">{p.quantity}</td><td className="right">{money(p.revenue)}</td><td className="right">{money(p.profit)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>By payment method</h3>
          {d.byPaymentMethod.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>Method</th><th className="right">Sales</th><th className="right">Collected</th></tr></thead>
              <tbody>{d.byPaymentMethod.map((m) => <tr key={m.method}><td>{capitalize(m.method)}</td><td className="right">{m.count}</td><td className="right">{money(m.total)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function ExpenseReport({ d }) {
  const money = useMoney();
  return (
    <>
      <div className="stats">
        <StatCard label="Total expenses" value={money(d.total)} />
        <StatCard label="Stock purchases" value={money(d.purchases.total)} hint={`${d.purchases.count} purchase orders`} />
        <StatCard label="Paid to suppliers (at purchase)" value={money(d.purchases.paid)} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>By category</h3>
            <button className="btn btn-light btn-sm" onClick={() => exportCsv('expenses-by-category', d.byCategory, [
              { key: 'category', label: 'Category' }, { key: 'count', label: 'Entries' }, { key: 'total', label: 'Total' }, { key: 'share', label: 'Share %' },
            ])}>Export CSV</button>
          </div>
          {d.byCategory.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>Category</th><th className="right">Entries</th><th className="right">Total</th><th className="right">Share</th></tr></thead>
              <tbody>
                {d.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td>{c.category}</td><td className="right">{c.count}</td><td className="right">{money(c.total)}</td>
                    <td className="right"><div className="share"><div style={{ width: `${c.share}%` }} /></div>{c.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Daily expenses</h3>
          <BarChart data={d.daily} format={money} />
        </div>
      </div>
    </>
  );
}

function Inventory({ d }) {
  const money = useMoney();
  const cols = [
    { key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Category' }, { key: 'quantity', label: 'Qty' },
    { key: 'purchasePrice', label: 'Unit cost' }, { key: 'sellingPrice', label: 'Unit price' }, { key: 'costValue', label: 'Cost value' }, { key: 'retailValue', label: 'Retail value' },
  ];
  return (
    <>
      <div className="stats">
        <StatCard label="Inventory value (cost)" value={money(d.totals.costValue)} hint={`${d.totals.units} units · ${d.totals.products} products`} />
        <StatCard label="Inventory value (retail)" value={money(d.totals.retailValue)} />
        <StatCard label="Potential profit" value={money(d.totals.potentialProfit)} tone="good" />
        <StatCard label="Low-stock products" value={d.totals.lowStock} tone={d.totals.lowStock ? 'warn' : 'good'} />
      </div>
      <div className="card">
        <h3>By category</h3>
        <table>
          <thead><tr><th>Category</th><th className="right">Products</th><th className="right">Units</th><th className="right">Cost value</th><th className="right">Retail value</th></tr></thead>
          <tbody>{d.byCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td className="right">{c.products}</td><td className="right">{c.quantity}</td><td className="right">{money(c.costValue)}</td><td className="right">{money(c.retailValue)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Products</h3>
          <button className="btn btn-light btn-sm" onClick={() => exportCsv('inventory-valuation', d.products, cols)}>Export CSV</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{cols.map((c) => <th key={c.key} className={['name', 'sku', 'category'].includes(c.key) ? '' : 'right'}>{c.label}</th>)}</tr></thead>
            <tbody>
              {d.products.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td><td className="mono">{p.sku}</td><td>{p.category}</td>
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
