import { en, so } from './messages.js';

const DICTIONARIES = { en, so };
export const LOCALES = { en: 'en-US', so: 'so-SO' };

// Pick the language from ?lang= or the Accept-Language header (first tag wins); default English.
export function languageFrom(req) {
  const fromQuery = String(req.query?.lang || '').toLowerCase();
  if (DICTIONARIES[fromQuery]) return fromQuery;
  const header = String(req.headers['accept-language'] || '').toLowerCase();
  const first = header.split(',')[0].trim().split(/[-;]/)[0];
  return DICTIONARIES[first] ? first : 'en';
}

export function translate(lang, key, vars) {
  let s = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return s;
}

// Translated field name for validation messages, falling back to the raw path.
export function fieldName(lang, path) {
  const key = `field.${path}`;
  const label = translate(lang, key);
  return label === key ? path : label;
}

// Express middleware: attaches req.lang and req.t(key, vars).
export function i18nMiddleware(req, res, next) {
  req.lang = languageFrom(req);
  req.t = (key, vars) => translate(req.lang, key, vars);
  res.setHeader('Content-Language', req.lang);
  next();
}
