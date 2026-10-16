import { useAuth } from '../context/AuthContext.jsx';

export function useMoney() {
  const { settings } = useAuth();
  const currency = settings?.currency || 'USD';
  return (n) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(n) || 0);
    } catch {
      return `${currency} ${(Number(n) || 0).toFixed(2)}`;
    }
  };
}

// Locale for date formatting; set by LanguageProvider when the language changes.
let dateLocale;
export function setDateLocale(locale) {
  dateLocale = locale;
}

const safeDate = (d, fn) => {
  try {
    return fn(dateLocale);
  } catch {
    return fn(undefined);
  }
};
export const fmtDate = (d) => (d ? safeDate(d, (l) => new Date(d).toLocaleDateString(l)) : '');
export const fmtDateTime = (d) => (d ? safeDate(d, (l) => new Date(d).toLocaleString(l)) : '');
export const toInputDate = (d = new Date()) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const monthStart = () => {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
};
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
