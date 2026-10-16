import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui.jsx';
import { useMoney } from '../utils/format.js';
import { PAYMENT_METHODS } from './Expenses.jsx';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Point-of-sale screen: search/scan products, build a cart, take payment, issue an invoice.
export default function NewSale() {
  const { settings } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const money = useMoney();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(settings?.defaultTaxRate || 0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/products', { params: { active: true } }).then(({ data }) => setProducts(data)).catch((e) => toast(errorMessage(e), 'error'));
    api.get('/customers').then(({ data }) => setCustomers(data)).catch(() => {});
  }, [toast]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? products.filter((p) => [p.name, p.sku, p.barcode].some((v) => v?.toLowerCase().includes(q))) : products;
    return list.slice(0, 30);
  }, [products, search]);

  const add = (p) => {
    if (p.quantity <= 0) return toast(t('pos.outOfStock', { name: p.name }), 'error');
    setCart((c) => {
      const existing = c.find((i) => i.product._id === p._id);
      if (existing) {
        if (existing.quantity >= p.quantity) { toast(t('pos.onlyN', { q: p.quantity, u: p.unit, name: p.name }), 'error'); return c; }
        return c.map((i) => (i.product._id === p._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { product: p, quantity: 1, unitPrice: p.sellingPrice }];
    });
    return undefined;
  };

  const update = (id, patch) => setCart((c) => c.map((i) => (i.product._id === id ? { ...i, ...patch } : i)));
  const removeLine = (id) => setCart((c) => c.filter((i) => i.product._id !== id));

  // Enter in the search box adds an exact SKU/barcode match (works with barcode scanners).
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = search.trim().toLowerCase();
    const exact = products.find((p) => p.sku.toLowerCase() === q || p.barcode?.toLowerCase() === q) || (matches.length === 1 && matches[0]);
    if (exact) { add(exact); setSearch(''); }
  };

  const subtotal = round2(cart.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0));
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = round2((subtotal - disc) * ((Number(taxRate) || 0) / 100));
  const total = round2(subtotal - disc + tax);
  const paid = amountPaid === '' ? total : Number(amountPaid) || 0;
  const change = round2(Math.max(paid - total, 0));
  const due = round2(Math.max(total - paid, 0));

  const checkout = async () => {
    if (!cart.length) return toast(t('pos.needItem'), 'error');
    if (!customer && due > 0) return toast(t('pos.needCustomer'), 'error');
    setBusy(true);
    try {
      const { data } = await api.post('/sales', {
        customer: customer || undefined,
        items: cart.map((i) => ({ product: i.product._id, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
        discount: disc,
        taxRate: Number(taxRate) || 0,
        amountPaid: Math.min(paid, total),
        paymentMethod,
        notes: notes || undefined,
      });
      toast(t('pos.completed', { inv: data.invoiceNumber }) + (change > 0 ? t('pos.changeDue', { v: money(change) }) : ''));
      navigate(`/sales/${data._id}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <PageHeader title={t('nav.newSale')} subtitle={t('pos.subtitle')} />
      <div className="pos">
        <div className="card pos-products">
          <input
            ref={searchRef}
            className="search search-lg"
            placeholder={t('pos.searchPh')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            autoFocus
          />
          <div className="product-grid">
            {matches.map((p) => (
              <button key={p._id} className={`product-tile ${p.quantity <= 0 ? 'disabled' : ''}`} onClick={() => add(p)}>
                <span className="tile-name">{p.name}</span>
                <span className="tile-meta">{p.sku}</span>
                <span className="tile-price">{money(p.sellingPrice)}</span>
                <span className={`tile-stock ${p.isLowStock ? 'text-warn' : ''}`}>{t('pos.inStock', { q: p.quantity, u: p.unit })}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card pos-cart">
          <h3>{t('pos.cart')}</h3>
          {cart.length === 0 ? <p className="muted">{t('pos.empty')}</p> : (
            <table className="cart-table">
              <thead><tr><th>{t('common.item')}</th><th>{t('common.qty')}</th><th>{t('pos.price')}</th><th className="right">{t('common.total')}</th><th /></tr></thead>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.product._id}>
                    <td>{i.product.name}</td>
                    <td><input type="number" min="1" max={i.product.quantity} step="1" value={i.quantity} onChange={(e) => update(i.product._id, { quantity: Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), i.product.quantity) })} /></td>
                    <td><input type="number" min="0" step="any" value={i.unitPrice} onChange={(e) => update(i.product._id, { unitPrice: e.target.value })} /></td>
                    <td className="right">{money((Number(i.unitPrice) || 0) * i.quantity)}</td>
                    <td><button className="btn-icon" onClick={() => removeLine(i.product._id)} aria-label={t('pos.remove')}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="form-grid compact">
            <label className="full">{t('common.customer')}
              <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">{t('common.walkIn')}</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
              </select>
            </label>
            <label>{t('common.discount')}<input type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <label>{t('pos.taxRate')}<input type="number" min="0" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></label>
            <label>{t('pos.paymentMethod')}
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
              </select>
            </label>
            <label>{t('pos.received')}<input type="number" min="0" step="any" placeholder={String(total)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></label>
            <label className="full">{t('common.notes')}<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>

          <div className="totals">
            <div><span>{t('common.subtotal')}</span><span>{money(subtotal)}</span></div>
            {disc > 0 && <div><span>{t('common.discount')}</span><span>−{money(disc)}</span></div>}
            {tax > 0 && <div><span>{t('common.taxPct', { rate: taxRate })}</span><span>{money(tax)}</span></div>}
            <div className="grand"><span>{t('common.total')}</span><span>{money(total)}</span></div>
            {change > 0 && <div className="text-good"><span>{t('pos.change')}</span><span>{money(change)}</span></div>}
            {due > 0 && <div className="text-bad"><span>{t('pos.dueOnAccount')}</span><span>{money(due)}</span></div>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || !cart.length} onClick={checkout}>
            {busy ? t('pos.processing') : t('pos.complete', { total: money(total) })}
          </button>
        </div>
      </div>
    </>
  );
}
