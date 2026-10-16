import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loading, PageHeader } from '../components/ui.jsx';

export default function Settings() {
  const { settings, setSettings } = useAuth();
  const { t } = useLang();
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
      toast(t('settings.saved'));
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <form className="card form-grid" onSubmit={save}>
        <label className="full">{t('settings.businessName')}<input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required /></label>
        <label className="full">{t('common.address')}<input value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label>{t('common.phone')}<input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>{t('common.email')}<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label>{t('settings.taxId')}<input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} /></label>
        <label>{t('settings.currency')}<input value={form.currency} maxLength={3} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder={t('settings.currencyPh')} /></label>
        <label>{t('settings.defaultTax')}<input type="number" min="0" step="any" value={form.defaultTaxRate} onChange={(e) => set('defaultTaxRate', e.target.value)} /></label>
        <label className="full">{t('settings.footer')}<textarea rows={2} value={form.invoiceFooter} onChange={(e) => set('invoiceFooter', e.target.value)} /></label>
        <div className="form-actions full"><button className="btn btn-primary">{t('settings.save')}</button></div>
      </form>
    </>
  );
}
