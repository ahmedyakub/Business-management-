import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui.jsx';
import { capitalize, useMoney } from '../utils/format.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Point-of-sale screen: search/scan products, build a cart, take payment, issue an invoice.
export default function NewSale() {
  const { settings } = useAuth();
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
    if (p.quantity <= 0) return toast(`${p.name} is out of stock`, 'error');
    setCart((c) => {
      const existing = c.find((i) => i.product._id === p._id);
      if (existing) {
        if (existing.quantity >= p.quantity) { toast(`Only ${p.quantity} ${p.unit} of ${p.name} in stock`, 'error'); return c; }
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
    if (!cart.length) return toast('Add at least one product', 'error');
    if (!customer && due > 0) return toast('Select a customer to sell on credit or partial payment', 'error');
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
      toast(`Sale ${data.invoiceNumber} completed${change > 0 ? ` — change due ${money(change)}` : ''}`);
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
      <PageHeader title="New Sale" subtitle="Search or scan products to add them to the cart" />
      <div className="pos">
        <div className="card pos-products">
          <input
            ref={searchRef}
            className="search search-lg"
            placeholder="Search by name, SKU or scan barcode, then press Enter"
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
                <span className={`tile-stock ${p.isLowStock ? 'text-warn' : ''}`}>{p.quantity} {p.unit} in stock</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card pos-cart">
          <h3>Cart</h3>
          {cart.length === 0 ? <p className="muted">Cart is empty.</p> : (
            <table className="cart-table">
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th className="right">Total</th><th /></tr></thead>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.product._id}>
                    <td>{i.product.name}</td>
                    <td><input type="number" min="1" max={i.product.quantity} step="1" value={i.quantity} onChange={(e) => update(i.product._id, { quantity: Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), i.product.quantity) })} /></td>
                    <td><input type="number" min="0" step="any" value={i.unitPrice} onChange={(e) => update(i.product._id, { unitPrice: e.target.value })} /></td>
                    <td className="right">{money((Number(i.unitPrice) || 0) * i.quantity)}</td>
                    <td><button className="btn-icon" onClick={() => removeLine(i.product._id)} aria-label="Remove">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="form-grid compact">
            <label className="full">Customer
              <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
              </select>
            </label>
            <label>Discount<input type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <label>Tax %<input type="number" min="0" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></label>
            <label>Payment method
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {['cash', 'card', 'bank', 'mobile'].map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
              </select>
            </label>
            <label>Amount received<input type="number" min="0" step="any" placeholder={String(total)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></label>
            <label className="full">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>

          <div className="totals">
            <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {disc > 0 && <div><span>Discount</span><span>−{money(disc)}</span></div>}
            {tax > 0 && <div><span>Tax ({taxRate}%)</span><span>{money(tax)}</span></div>}
            <div className="grand"><span>Total</span><span>{money(total)}</span></div>
            {change > 0 && <div className="text-good"><span>Change</span><span>{money(change)}</span></div>}
            {due > 0 && <div className="text-bad"><span>Balance due (on account)</span><span>{money(due)}</span></div>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || !cart.length} onClick={checkout}>
            {busy ? 'Processing…' : `Complete sale · ${money(total)}`}
          </button>
        </div>
      </div>
    </>
  );
}
