import { useEffect, useState } from 'react';
import api from '../api/client.js';
import ResourcePage from '../components/ResourcePage.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { fmtDate } from '../utils/format.js';

const ROLE_ORDER = ['admin', 'manager', 'cashier', 'inventory'];

export default function Users() {
  const { t } = useLang();
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    api.get('/users/roles').then(({ data }) => setRoles(data.map((r) => r.role))).catch(() => {});
  }, []);

  return (
    <>
      <ResourcePage
        title={t('users.title')}
        singular={t('users.singular')}
        subtitle={t('users.subtitle')}
        endpoint="/users"
        resource="users"
        canWrite
        searchable={false}
        emptyItem={{ name: '', email: '', password: '', role: 'cashier', active: true }}
        fields={[
          { name: 'name', label: t('users.fullName'), required: true, full: true },
          { name: 'email', label: t('common.email'), type: 'email', required: true },
          { name: 'role', label: t('users.role'), type: 'select', required: true, options: roles.map((r) => ({ value: r, label: t(`role.${r}`) })) },
          { name: 'password', label: t('users.password'), type: 'password', required: (u) => !u._id, placeholder: t('users.pwPh') },
          { name: 'active', label: t('common.active'), type: 'checkbox' },
        ]}
        columns={[
          { key: 'name', label: t('common.name') },
          { key: 'email', label: t('common.email') },
          { key: 'role', label: t('users.role'), render: (u) => <span className={`role role-${u.role}`}>{t(`role.${u.role}`)}</span> },
          { key: 'active', label: t('common.status'), render: (u) => (u.active ? t('common.active') : t('common.disabled')) },
          { key: 'createdAt', label: t('common.created'), render: (u) => fmtDate(u.createdAt) },
        ]}
      />
      <div className="card">
        <h3>{t('users.rolesTitle')}</h3>
        <table>
          <tbody>
            {ROLE_ORDER.map((role) => (
              <tr key={role}><td><span className={`role role-${role}`}>{t(`role.${role}`)}</span></td><td>{t(`roleInfo.${role}`)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
