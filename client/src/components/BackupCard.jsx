import { useRef, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtDateTime } from '../utils/format.js';

// Download a full-data backup file, or restore one (admin only).
export default function BackupCard() {
  const { settings, setSettings } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState('');

  const downloadBackup = async () => {
    setBusy('download');
    try {
      const res = await api.get('/backup', { responseType: 'blob' });
      const name = res.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1] || 'backup.json';
      const href = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
      setSettings((s) => ({ ...s, lastBackupAt: new Date().toISOString() }));
      toast(t('backup.downloaded'));
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy('');
    }
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(t('backup.confirm', { file: file.name }))) return;
    setBusy('restore');
    try {
      let text;
      try {
        text = await file.text();
        JSON.parse(text);
      } catch {
        toast(t('backup.readError'), 'error');
        return;
      }
      const { data } = await api.post('/backup/restore', text, { headers: { 'Content-Type': 'application/json' } });
      toast(data.message);
      // Users, settings and everything else changed; reload so the app picks up the restored data.
      setTimeout(() => window.location.assign('/'), 1500);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="card">
      <h3>{t('backup.title')}</h3>
      <p>{t('backup.intro')}</p>
      <p className="muted small">{settings?.lastBackupAt ? t('backup.last', { date: fmtDateTime(settings.lastBackupAt) }) : t('backup.never')}</p>
      <div className="actions">
        <button className="btn btn-primary" onClick={downloadBackup} disabled={!!busy}>
          {busy === 'download' ? t('backup.downloading') : t('backup.download')}
        </button>
      </div>
      <p className="muted small">🔒 {t('backup.sensitive')}</p>

      <h3 className="backup-restore">{t('backup.restoreTitle')}</h3>
      <p className="text-warn">⚠️ {t('backup.restoreIntro')}</p>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={restore} />
      <button className="btn btn-danger" onClick={() => fileRef.current?.click()} disabled={!!busy}>
        {busy === 'restore' ? t('backup.restoring') : t('backup.choose')}
      </button>
    </div>
  );
}
