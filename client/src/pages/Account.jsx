import { useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui.jsx';

export default function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return toast('Passwords do not match', 'error');
    try {
      await api.put('/auth/password', form);
      toast('Password updated');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
    return undefined;
  };

  return (
    <>
      <PageHeader title="My account" subtitle={`${user.name} · ${user.email} · ${user.role}`} />
      <form className="card form-grid narrow" onSubmit={save}>
        <h3 className="full">Change password</h3>
        <label className="full">Current password<input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required /></label>
        <label>New password<input type="password" minLength={6} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required /></label>
        <label>Confirm new password<input type="password" minLength={6} value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required /></label>
        <div className="form-actions full"><button className="btn btn-primary">Update password</button></div>
      </form>
    </>
  );
}
