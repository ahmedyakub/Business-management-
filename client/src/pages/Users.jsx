import { useEffect, useState } from 'react';
import api from '../api/client.js';
import ResourcePage from '../components/ResourcePage.jsx';
import { capitalize, fmtDate } from '../utils/format.js';

const ROLE_INFO = {
  admin: 'Full access, including users and settings',
  manager: 'All business operations and reports; no user management',
  cashier: 'Point of sale, invoices, customers and customer payments',
  inventory: 'Products, categories, suppliers, purchases and inventory valuation',
};

export default function Users() {
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    api.get('/users/roles').then(({ data }) => setRoles(data.map((r) => r.role))).catch(() => {});
  }, []);

  return (
    <>
      <ResourcePage
        title="Users"
        subtitle="Staff accounts and their roles"
        endpoint="/users"
        resource="users"
        canWrite
        searchable={false}
        emptyItem={{ name: '', email: '', password: '', role: 'cashier', active: true }}
        fields={[
          { name: 'name', label: 'Full name', required: true, full: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'role', label: 'Role', type: 'select', required: true, options: roles.map((r) => ({ value: r, label: capitalize(r) })) },
          { name: 'password', label: 'Password (leave blank to keep)', type: 'password', required: (u) => !u._id, placeholder: 'min. 6 characters' },
          { name: 'active', label: 'Active', type: 'checkbox' },
        ]}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (u) => <span className={`role role-${u.role}`}>{u.role}</span> },
          { key: 'active', label: 'Status', render: (u) => (u.active ? 'Active' : 'Disabled') },
          { key: 'createdAt', label: 'Created', render: (u) => fmtDate(u.createdAt) },
        ]}
      />
      <div className="card">
        <h3>Roles &amp; permissions</h3>
        <table>
          <tbody>
            {Object.entries(ROLE_INFO).map(([role, info]) => (
              <tr key={role}><td><span className={`role role-${role}`}>{role}</span></td><td>{info}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
