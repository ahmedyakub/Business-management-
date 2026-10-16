import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en.js';
import so from '../i18n/so.js';
import { setDateLocale } from '../utils/format.js';

const DICTIONARIES = { en, so };

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'so', label: 'Soomaali', short: 'SO' },
];

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem('lang');
    if (DICTIONARIES[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('so') ? 'so' : 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(initialLanguage);

  // Set before children render so date helpers format in the active language.
  setDateLocale(lang === 'so' ? 'so-SO' : undefined);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang]);

  // t('key', { var }) looks up the active language, falls back to English, then to the key itself.
  const t = useCallback((key, vars) => {
    let s = DICTIONARIES[lang][key] ?? en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
