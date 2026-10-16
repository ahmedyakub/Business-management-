import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequirePermission({ perm, children }) {
  const { can } = useAuth();
  if (!can(...[].concat(perm))) return <Navigate to="/forbidden" replace />;
  return children;
}
