import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loading, PageHeader } from '../components/ui.jsx';

export default function Settings() {
  const { settings, setSettings } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  if (!form) return <Loading />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/settings', form);
      setSettings(data);
      toast('Settings saved');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title="Business settings" subtitle="These details appear on invoices and receipts" />
      <form className="card form-grid" onSubmit={save}>
        <label className="full">Business name<input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required /></label>
        <label className="full">Address<input value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label>Tax ID / VAT number<input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} /></label>
        <label>Currency (ISO code)<input value={form.currency} maxLength={3} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder="USD, EUR, KES…" /></label>
        <label>Default tax rate %<input type="number" min="0" step="any" value={form.defaultTaxRate} onChange={(e) => set('defaultTaxRate', e.target.value)} /></label>
        <label className="full">Invoice footer<textarea rows={2} value={form.invoiceFooter} onChange={(e) => set('invoiceFooter', e.target.value)} /></label>
        <div className="form-actions full"><button className="btn btn-primary">Save settings</button></div>
      </form>
    </>
  );
}
