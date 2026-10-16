import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Empty, Loading, PageHeader } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';

export default function Notifications() {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/notifications').then(({ data: d }) => setData(d)).catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const markAll = async () => { await api.put('/notifications/read-all'); load(); };
  const mark = async (id) => { await api.put(`/notifications/${id}/read`); load(); };

  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unread} unread` : ''}>
        {data?.unread > 0 && <button className="btn btn-light" onClick={markAll}>Mark all as read</button>}
      </PageHeader>
      <div className="card">
        {!data ? <Loading /> : data.items.length === 0 ? <Empty>No notifications.</Empty> : (
          <ul className="notif-list">
            {data.items.map((n) => (
              <li key={n._id} className={n.read ? 'read' : ''}>
                <span className="notif-icon">{n.type === 'low_stock' ? '⚠️' : 'ℹ️'}</span>
                <div className="notif-body">
                  <div>{n.message}</div>
                  <div className="muted small">
                    {fmtDateTime(n.updatedAt)}
                    {n.product && ` · current stock: ${n.product.quantity} ${n.product.unit} (min ${n.product.minStock})`}
                  </div>
                </div>
                {!n.read && <button className="btn btn-light btn-sm" onClick={() => mark(n._id)}>Mark read</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
