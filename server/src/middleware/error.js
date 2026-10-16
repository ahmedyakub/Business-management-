import { fieldName, translate } from '../i18n/index.js';

export function notFound(req, res) {
  res.status(404).json({ message: req.t('errors.routeNotFound', { url: req.originalUrl }) });
}

// Turn known errors into a status and a message in the request's language.
function describe(err, lang) {
  const t = (key, vars) => translate(lang, key, vars);
  if (err.key) return [err.status || 500, t(err.key, err.vars)];
  if (err.name === 'ValidationError') {
    const parts = Object.values(err.errors).map((e) => {
      const field = fieldName(lang, e.path);
      if (e.kind === 'required') return t('errors.required', { field });
      if (e.kind === 'min') return t('errors.min', { field, min: e.properties?.min });
      if (e.kind === 'enum') return t('errors.invalidOption', { field });
      if (e.name === 'CastError') return t('errors.invalidValue', { field, value: e.value });
      return e.message;
    });
    return [400, parts.join(', ')];
  }
  if (err.name === 'CastError') {
    return [400, t('errors.invalidValue', { field: fieldName(lang, String(err.path).replace(/^_/, '')), value: err.value })];
  }
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).map((f) => fieldName(lang, f)).join(', ');
    return [409, t('errors.duplicate', { fields })];
  }
  if (err.type === 'entity.parse.failed') return [400, err.message];
  return [err.status || 500, err.status && err.status < 500 ? err.message : t('errors.server')];
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const [status, message] = describe(err, req.lang || 'en');
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
