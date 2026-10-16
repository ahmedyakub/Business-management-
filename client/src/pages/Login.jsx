import { useState } from 'react';
import { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import LanguageSwitch from '../components/LanguageSwitch.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <LanguageSwitch />
        <h1>{t('appName')}</h1>
        <p className="muted">{t('login.subtitle')}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>{t('common.email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>{t('login.password')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t('login.signingIn') : t('login.signIn')}</button>
        <p className="muted small">{t('login.demo')} admin@example.com / admin123</p>
      </form>
    </div>
  );
}
