import { useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui.jsx';

export default function Account() {
  const { user } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return toast(t('account.mismatch'), 'error');
    try {
      await api.put('/auth/password', form);
      toast(t('account.updated'));
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
    return undefined;
  };

  return (
    <>
      <PageHeader title={t('account.title')} subtitle={`${user.name} · ${user.email} · ${t(`role.${user.role}`)}`} />
      <form className="card form-grid narrow" onSubmit={save}>
        <h3 className="full">{t('account.changePw')}</h3>
        <label className="full">{t('account.current')}<input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required /></label>
        <label>{t('account.new')}<input type="password" minLength={6} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required /></label>
        <label>{t('account.confirm')}<input type="password" minLength={6} value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required /></label>
        <div className="form-actions full"><button className="btn btn-primary">{t('account.update')}</button></div>
      </form>
    </>
  );
}
