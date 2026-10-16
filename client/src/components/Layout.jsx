import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', perm: 'dashboard:read', end: true },
  { to: '/sales/new', label: 'New Sale', icon: '🛒', perm: 'sales:write' },
  { to: '/sales', label: 'Sales & Invoices', icon: '🧾', perm: 'sales:read', end: true },
  { to: '/products', label: 'Products', icon: '📦', perm: 'products:read' },
  { to: '/categories', label: 'Categories', icon: '🏷️', perm: 'categories:read' },
  { to: '/purchases', label: 'Purchases', icon: '🚚', perm: 'purchases:read' },
  { to: '/customers', label: 'Customers', icon: '👥', perm: 'customers:read' },
  { to: '/suppliers', label: 'Suppliers', icon: '🏭', perm: 'suppliers:read' },
  { to: '/expenses', label: 'Expenses', icon: '💸', perm: 'expenses:read' },
  { to: '/reports', label: 'Reports', icon: '📊', perm: ['reports:read', 'reports:inventory'] },
  { to: '/users', label: 'Users & Roles', icon: '🔐', perm: 'users:manage' },
  { to: '/settings', label: 'Settings', icon: '⚙️', perm: 'settings:write' },
];

export default function Layout() {
  const { user, settings, logout, can } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Poll for new low-stock alerts.
  useEffect(() => {
    if (!can('notifications:read')) return undefined;
    const load = () => api.get('/notifications?unread=true').then(({ data }) => setUnread(data.unread)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [can, location.pathname]);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className={`layout ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">{settings?.businessName || 'Business Manager'}</div>
        <nav>
          {NAV.filter((n) => can(...[].concat(n.perm))).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
          <div className="spacer" />
          {can('notifications:read') && (
            <Link to="/notifications" className="bell" title="Notifications">
              🔔{unread > 0 && <span className="badge-count">{unread}</span>}
            </Link>
          )}
          <div className="user-chip">
            <strong>{user?.name}</strong>
            <span className={`role role-${user?.role}`}>{user?.role}</span>
          </div>
          <Link to="/account" className="btn btn-light btn-sm">Account</Link>
          <button className="btn btn-light btn-sm" onClick={logout}>Logout</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <div className="backdrop" onClick={() => setOpen(false)} />
    </div>
  );
}
