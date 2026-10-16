import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Empty, Loading, PageHeader } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';

export default function Notifications() {
  const { t } = useLang();
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/notifications').then(({ data: d }) => setData(d)).catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const markAll = async () => { await api.put('/notifications/read-all'); load(); };
  const mark = async (id) => { await api.put(`/notifications/${id}/read`); load(); };

  // Low-stock messages are rebuilt from product data so they follow the selected language.
  const message = (n) => {
    const p = n.product;
    if (n.type !== 'low_stock' || !p) return n.message;
    return p.quantity <= 0
      ? t('notif.out', { name: p.name })
      : t('notif.low', { name: p.name, q: p.quantity, u: p.unit, m: p.minStock });
  };

  return (
    <>
      <PageHeader title={t('common.notifications')} subtitle={data ? t('notif.subtitle', { n: data.unread }) : ''}>
        {data?.unread > 0 && <button className="btn btn-light" onClick={markAll}>{t('notif.markAll')}</button>}
      </PageHeader>
      <div className="card">
        {!data ? <Loading /> : data.items.length === 0 ? <Empty>{t('notif.none')}</Empty> : (
          <ul className="notif-list">
            {data.items.map((n) => (
              <li key={n._id} className={n.read ? 'read' : ''}>
                <span className="notif-icon">{n.type === 'low_stock' ? '⚠️' : 'ℹ️'}</span>
                <div className="notif-body">
                  <div>{message(n)}</div>
                  <div className="muted small">
                    {fmtDateTime(n.updatedAt)}
                    {n.product && ` · ${t('notif.currentStock', { q: n.product.quantity, u: n.product.unit, m: n.product.minStock })}`}
                  </div>
                </div>
                {!n.read && <button className="btn btn-light btn-sm" onClick={() => mark(n._id)}>{t('notif.markRead')}</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
