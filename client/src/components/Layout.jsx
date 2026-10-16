import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';

const NAV = [
  { to: '/', label: 'nav.dashboard', icon: '🏠', perm: 'dashboard:read', end: true },
  { to: '/sales/new', label: 'nav.newSale', icon: '🛒', perm: 'sales:write' },
  { to: '/sales', label: 'nav.sales', icon: '🧾', perm: 'sales:read', end: true },
  { to: '/products', label: 'nav.products', icon: '📦', perm: 'products:read' },
  { to: '/categories', label: 'nav.categories', icon: '🏷️', perm: 'categories:read' },
  { to: '/purchases', label: 'nav.purchases', icon: '🚚', perm: 'purchases:read' },
  { to: '/customers', label: 'nav.customers', icon: '👥', perm: 'customers:read' },
  { to: '/suppliers', label: 'nav.suppliers', icon: '🏭', perm: 'suppliers:read' },
  { to: '/expenses', label: 'nav.expenses', icon: '💸', perm: 'expenses:read' },
  { to: '/reports', label: 'nav.reports', icon: '📊', perm: ['reports:read', 'reports:inventory'] },
  { to: '/users', label: 'nav.users', icon: '🔐', perm: 'users:manage' },
  { to: '/settings', label: 'nav.settings', icon: '⚙️', perm: 'settings:write' },
];

export default function Layout() {
  const { user, settings, logout, can } = useAuth();
  const { t } = useLang();
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
        <div className="brand">{settings?.businessName || t('appName')}</div>
        <nav>
          {NAV.filter((n) => can(...[].concat(n.perm))).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">{n.icon}</span> {t(n.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-toggle" onClick={() => setOpen((o) => !o)} aria-label={t('common.menu')}>☰</button>
          <div className="spacer" />
          <LanguageSwitch />
          {can('notifications:read') && (
            <Link to="/notifications" className="bell" title={t('common.notifications')}>
              🔔{unread > 0 && <span className="badge-count">{unread}</span>}
            </Link>
          )}
          <div className="user-chip">
            <strong>{user?.name}</strong>
            <span className={`role role-${user?.role}`}>{t(`role.${user?.role}`)}</span>
          </div>
          <Link to="/account" className="btn btn-light btn-sm">{t('common.account')}</Link>
          <button className="btn btn-light btn-sm" onClick={logout}>{t('common.logout')}</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <div className="backdrop" onClick={() => setOpen(false)} />
    </div>
  );
}
