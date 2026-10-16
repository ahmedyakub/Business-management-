import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch {
      /* settings are optional for rendering */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return setLoading(false);
    api.get('/auth/me')
      .then(({ data }) => { setUser(data); return loadSettings(); })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, [loadSettings]);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await loadSettings();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(() => {
    const perms = user?.permissions || [];
    const can = (...required) => perms.includes('*') || required.some((p) => perms.includes(p));
    return { user, settings, setSettings, loading, login, logout, can };
  }, [user, settings, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
