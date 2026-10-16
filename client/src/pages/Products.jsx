import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { Empty, Loading, PageHeader } from '../components/ui.jsx';
import { useMoney } from '../utils/format.js';

const EMPTY = { name: '', sku: '', barcode: '', category: '', unit: 'pcs', purchasePrice: '', sellingPrice: '', quantity: 0, minStock: 5, description: '', active: true };

export default function Products() {
  const { can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const money = useMoney();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', lowStock: false, showInactive: false });
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const writable = can('products:write');

  const load = useCallback(() => {
    const params = {
      search: filters.search || undefined,
      category: filters.category || undefined,
      lowStock: filters.lowStock || undefined,
      active: filters.showInactive ? undefined : true,
    };
    api.get('/products', { params }).then(({ data }) => setProducts(data)).catch((e) => toast(errorMessage(e), 'error'));
  }, [filters, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...editing, category: editing.category?._id ?? editing.category };
      if (editing._id) await api.put(`/products/${editing._id}`, body);
      else await api.post('/products', body);
      toast(t('products.saved'));
      setEditing(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const adjust = async (e) => {
    e.preventDefault();
    try {
      const change = Number(adjusting.change) * (adjusting.direction === 'out' ? -1 : 1);
      await api.post(`/products/${adjusting.product._id}/adjust`, { change });
      toast(t('products.adjusted'));
      setAdjusting(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(t('products.confirmDelete', { name: p.name }))) return;
    try {
      const { data } = await api.delete(`/products/${p._id}`);
      toast(data.message);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const set = (k, v) => setEditing((x) => ({ ...x, [k]: v }));
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader title={t('nav.products')} subtitle={t('products.subtitle')}>
        <input className="search" placeholder={t('products.search')} value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
        <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
          <option value="">{t('products.allCategories')}</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <label className="inline"><input type="checkbox" checked={filters.lowStock} onChange={(e) => setFilter('lowStock', e.target.checked)} /> {t('products.lowOnly')}</label>
        <label className="inline"><input type="checkbox" checked={filters.showInactive} onChange={(e) => setFilter('showInactive', e.target.checked)} /> {t('products.showInactive')}</label>
        {writable && <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>{t('products.add')}</button>}
      </PageHeader>

      <div className="card">
        {!products ? <Loading /> : products.length === 0 ? <Empty>{t('products.none')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('common.product')}</th><th>SKU</th><th>{t('common.category')}</th>
                  <th className="right">{t('products.cost')}</th><th className="right">{t('products.price')}</th>
                  <th className="right">{t('products.stock')}</th><th className="right">{t('products.min')}</th>
                  {writable && <th className="right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className={p.active ? '' : 'inactive'}>
                    <td>{p.name}{!p.active && <span className="muted small"> ({t('common.inactive')})</span>}</td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category?.name || '—'}</td>
                    <td className="right">{money(p.purchasePrice)}</td>
                    <td className="right">{money(p.sellingPrice)}</td>
                    <td className="right">
                      <span className={p.quantity === 0 ? 'pill pill-bad' : p.isLowStock ? 'pill pill-warn' : 'pill pill-good'}>{p.quantity} {p.unit}</span>
                    </td>
                    <td className="right">{p.minStock}</td>
                    {writable && (
                      <td className="right nowrap">
                        <button className="btn btn-light btn-sm" onClick={() => setAdjusting({ product: p, change: 1, direction: 'in' })}>{t('products.adjustBtn')}</button>{' '}
                        <button className="btn btn-light btn-sm" onClick={() => setEditing({ ...p, category: p.category?._id || '' })}>{t('common.edit')}</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>{t('common.delete')}</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing._id ? t('products.editTitle') : t('products.newTitle')} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={save}>
            <label className="full">{t('common.name')} *<input value={editing.name} onChange={(e) => set('name', e.target.value)} required /></label>
            <label>SKU *<input value={editing.sku} onChange={(e) => set('sku', e.target.value)} required /></label>
            <label>{t('products.barcode')}<input value={editing.barcode || ''} onChange={(e) => set('barcode', e.target.value)} /></label>
            <label>{t('common.category')}
              <select value={editing.category || ''} onChange={(e) => set('category', e.target.value)}>
                <option value="">{t('products.uncategorized')}</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </label>
            <label>{t('products.unit')}<input value={editing.unit} onChange={(e) => set('unit', e.target.value)} placeholder={t('products.unitPh')} /></label>
            <label>{t('products.purchasePrice')} *<input type="number" min="0" step="any" value={editing.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} required /></label>
            <label>{t('products.sellingPrice')} *<input type="number" min="0" step="any" value={editing.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} required /></label>
            <label>{editing._id ? t('products.qtyInStock') : t('products.openingStock')}<input type="number" min="0" step="1" value={editing.quantity} onChange={(e) => set('quantity', e.target.value)} /></label>
            <label>{t('products.minStock')}<input type="number" min="0" step="1" value={editing.minStock} onChange={(e) => set('minStock', e.target.value)} /></label>
            <label className="full">{t('common.description')}<textarea rows={2} value={editing.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
            <label className="inline full"><input type="checkbox" checked={editing.active} onChange={(e) => set('active', e.target.checked)} /> {t('products.activeLabel')}</label>
            {editing.purchasePrice !== '' && editing.sellingPrice !== '' && (
              <p className="muted full">{t('products.margin', { v: money(editing.sellingPrice - editing.purchasePrice) })}</p>
            )}
            <div className="form-actions full">
              <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}

      {adjusting && (
        <Modal title={t('products.adjustTitle', { name: adjusting.product.name })} onClose={() => setAdjusting(null)}>
          <form className="form-grid" onSubmit={adjust}>
            <p className="full muted">{t('products.current', { q: adjusting.product.quantity, u: adjusting.product.unit })}</p>
            <label>{t('products.direction')}
              <select value={adjusting.direction} onChange={(e) => setAdjusting((a) => ({ ...a, direction: e.target.value }))}>
                <option value="in">{t('products.addStock')}</option>
                <option value="out">{t('products.removeStock')}</option>
              </select>
            </label>
            <label>{t('products.quantity')}<input type="number" min="1" step="1" value={adjusting.change} onChange={(e) => setAdjusting((a) => ({ ...a, change: e.target.value }))} required /></label>
            <div className="form-actions full">
              <button type="button" className="btn btn-light" onClick={() => setAdjusting(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary">{t('products.apply')}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
