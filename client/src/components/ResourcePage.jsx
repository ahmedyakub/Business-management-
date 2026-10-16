import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from './Modal.jsx';
import { Empty, Loading, PageHeader } from './ui.jsx';

// Generic list + create/edit/delete page driven by a field/column config.
export default function ResourcePage({
  title, subtitle, endpoint, resource, fields, columns, searchable = true, emptyItem = {}, onRowClick, extraParams, toolbar, canWrite,
}) {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const writable = canWrite ?? can(`${resource}:write`);

  const load = useCallback(() => {
    api.get(endpoint, { params: { search: search || undefined, ...extraParams } })
      .then(({ data }) => setItems(data))
      .catch((e) => toast(errorMessage(e), 'error'));
  }, [endpoint, search, extraParams, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing._id) await api.put(`${endpoint}/${editing._id}`, editing);
      else await api.post(endpoint, editing);
      toast(`${editing._id ? 'Updated' : 'Created'} successfully`);
      setEditing(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      const { data } = await api.delete(`${endpoint}/${item._id}`);
      toast(data.message || 'Deleted');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const set = (name, value) => setEditing((x) => ({ ...x, [name]: value }));

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {toolbar}
        {searchable && <input className="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />}
        {writable && <button className="btn btn-primary" onClick={() => setEditing({ ...emptyItem })}>+ Add</button>}
      </PageHeader>

      <div className="card">
        {!items ? <Loading /> : items.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'right' : ''}>{c.label}</th>)}
                  {writable && <th className="right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(item)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.align === 'right' ? 'right' : ''}>{c.render ? c.render(item) : item[c.key]}</td>
                    ))}
                    {writable && (
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-light btn-sm" onClick={() => setEditing({ ...item })}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => remove(item)}>Delete</button>
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
        <Modal title={`${editing._id ? 'Edit' : 'New'} ${title.replace(/s$/, '')}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form-grid">
            {fields.filter((f) => !f.hidden?.(editing)).map((f) => (
              <label key={f.name} className={f.full ? 'full' : ''}>
                {f.label}{f.required && ' *'}
                {f.type === 'select' ? (
                  <select value={editing[f.name] ?? ''} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                    {!f.required && <option value="">—</option>}
                    {f.options.map((o) => {
                      const opt = typeof o === 'string' ? { value: o, label: o } : o;
                      return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                    })}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea value={editing[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} rows={3} />
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!editing[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                ) : (
                  <input
                    type={f.type || 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    min={f.min}
                    value={f.type === 'date' ? (editing[f.name] || '').slice(0, 10) : editing[f.name] ?? ''}
                    required={typeof f.required === 'function' ? f.required(editing) : f.required}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </label>
            ))}
            <div className="form-actions full">
              <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
