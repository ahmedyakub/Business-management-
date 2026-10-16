import { LANGUAGES, useLang } from '../context/LanguageContext.jsx';

// EN | SO toggle shown in the top bar and on the login page.
export default function LanguageSwitch() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={lang === l.code ? 'active' : ''}
          aria-pressed={lang === l.code}
          title={l.label}
          onClick={() => setLang(l.code)}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
