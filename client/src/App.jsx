import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RequirePermission from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Categories from './pages/Categories.jsx';
import Customers from './pages/Customers.jsx';
import Suppliers from './pages/Suppliers.jsx';
import PartyDetail from './pages/PartyDetail.jsx';
import Sales from './pages/Sales.jsx';
import NewSale from './pages/NewSale.jsx';
import Invoice from './pages/Invoice.jsx';
import Purchases from './pages/Purchases.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Account from './pages/Account.jsx';

const guard = (perm, el) => <RequirePermission perm={perm}>{el}</RequirePermission>;

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={guard('dashboard:read', <Dashboard />)} />
        <Route path="products" element={guard('products:read', <Products />)} />
        <Route path="categories" element={guard('categories:read', <Categories />)} />
        <Route path="customers" element={guard('customers:read', <Customers />)} />
        <Route path="customers/:id" element={guard('customers:read', <PartyDetail type="customer" />)} />
        <Route path="suppliers" element={guard('suppliers:read', <Suppliers />)} />
        <Route path="suppliers/:id" element={guard('suppliers:read', <PartyDetail type="supplier" />)} />
        <Route path="sales" element={guard('sales:read', <Sales />)} />
        <Route path="sales/new" element={guard('sales:write', <NewSale />)} />
        <Route path="sales/:id" element={guard('sales:read', <Invoice />)} />
        <Route path="purchases" element={guard('purchases:read', <Purchases />)} />
        <Route path="expenses" element={guard('expenses:read', <Expenses />)} />
        <Route path="reports" element={guard(['reports:read', 'reports:inventory'], <Reports />)} />
        <Route path="users" element={guard('users:manage', <Users />)} />
        <Route path="notifications" element={guard('notifications:read', <Notifications />)} />
        <Route path="settings" element={guard('settings:write', <Settings />)} />
        <Route path="account" element={<Account />} />
        <Route path="forbidden" element={<div className="card empty">You do not have permission to view this page.</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
