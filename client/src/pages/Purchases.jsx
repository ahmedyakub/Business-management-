import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { DateRange, Empty, Loading, PageHeader, Status } from '../components/ui.jsx';
import { fmtDate, monthStart, toInputDate, useMoney } from '../utils/format.js';

export default function Purchases() {
  const { can } = useAuth();
  const toast = useToast();
  const money = useMoney();
  const [purchases, setPurchases] = useState(null);
  const [range, setRange] = useState({ from: monthStart(), to: toInputDate() });
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const load = useCallback(() => {
    api.get('/purchases', { params: { from: range.from || undefined, to: range.to || undefined } })
      .then(({ data }) => setPurchases(data))
      .catch((e) => toast(errorMessage(e), 'error'));
  }, [range, toast]);

  useEffect(() => { load(); }, [load]);

  const openForm = async () => {
    try {
      const [s, p] = await Promise.all([api.get('/suppliers'), api.get('/products', { params: { active: true } })]);
      setSuppliers(s.data);
      setProducts(p.data);
      setForm({ supplier: s.data[0]?._id || '', date: toInputDate(), items: [{ product: '', quantity: 1, unitCost: '' }], amountPaid: 0, notes: '', updateCostPrice: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const total = form ? form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0) : 0;

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/purchases', { ...form, items: form.items.filter((i) => i.product) });
      toast('Purchase recorded and stock updated');
      setForm(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title="Purchases" subtitle="Stock received from suppliers">
        <DateRange {...range} onChange={setRange} />
        {can('purchases:write') && <button className="btn btn-primary" onClick={openForm}>+ New purchase</button>}
      </PageHeader>

      <div className="card">
        {!purchases ? <Loading /> : purchases.length === 0 ? <Empty>No purchases in this period.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ref</th><th>Date</th><th>Supplier</th><th>Items</th><th>Status</th><th className="right">Total</th><th className="right">Paid</th></tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p._id} className="clickable" onClick={() => setViewing(p)}>
                    <td className="mono">{p.reference}</td>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.supplier?.name}</td>
                    <td>{p.items.length}</td>
                    <td><Status value={p.status} /></td>
                    <td className="right">{money(p.total)}</td>
                    <td className="right">{money(p.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <Modal title={`Purchase ${viewing.reference}`} onClose={() => setViewing(null)}>
          <p>{viewing.supplier?.name} · {fmtDate(viewing.date)} · <Status value={viewing.status} /></p>
          <table>
            <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Unit cost</th><th className="right">Total</th></tr></thead>
            <tbody>
              {viewing.items.map((i, idx) => (
                <tr key={idx}><td>{i.name}</td><td className="right">{i.quantity}</td><td className="right">{money(i.unitCost)}</td><td className="right">{money(i.total)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <div className="grand"><span>Total</span><span>{money(viewing.total)}</span></div>
            <div><span>Paid</span><span>{money(viewing.amountPaid)}</span></div>
          </div>
          {viewing.notes && <p className="small">Notes: {viewing.notes}</p>}
        </Modal>
      )}

      {form && (
        <Modal title="New purchase" onClose={() => setForm(null)} wide>
          {suppliers.length === 0 ? <Empty>Add a supplier first.</Empty> : (
            <form onSubmit={save} className="form-grid">
              <label>Supplier *
                <select value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} required>
                  {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </label>
              <label>Date<input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></label>
              <div className="full">
                <table className="cart-table">
                  <thead><tr><th>Product</th><th>Qty</th><th>Unit cost</th><th className="right">Total</th><th /></tr></thead>
                  <tbody>
                    {form.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <select value={it.product} required onChange={(e) => {
                            const p = products.find((x) => x._id === e.target.value);
                            setItem(idx, { product: e.target.value, unitCost: p ? p.purchasePrice : '' });
                          }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku}) — stock {p.quantity}</option>)}
                          </select>
                        </td>
                        <td><input type="number" min="1" step="1" value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} required /></td>
                        <td><input type="number" min="0" step="any" value={it.unitCost} onChange={(e) => setItem(idx, { unitCost: e.target.value })} required /></td>
                        <td className="right">{money((Number(it.quantity) || 0) * (Number(it.unitCost) || 0))}</td>
                        <td>{form.items.length > 1 && <button type="button" className="btn-icon" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { product: '', quantity: 1, unitCost: '' }] }))}>+ Add line</button>
              </div>
              <label>Amount paid now<input type="number" min="0" step="any" value={form.amountPaid} onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))} /></label>
              <label>Notes<input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <label className="inline full"><input type="checkbox" checked={form.updateCostPrice} onChange={(e) => setForm((f) => ({ ...f, updateCostPrice: e.target.checked }))} /> Update product purchase prices to these costs</label>
              <div className="totals full">
                <div className="grand"><span>Total</span><span>{money(total)}</span></div>
                <div><span>Added to supplier balance</span><span>{money(Math.max(total - (Number(form.amountPaid) || 0), 0))}</span></div>
              </div>
              <div className="form-actions full">
                <button type="button" className="btn btn-light" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn btn-primary">Save purchase</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
