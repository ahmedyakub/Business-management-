export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async route handlers so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD into a Mongo date filter (inclusive of the whole "to" day).
export function dateRange(query, field = 'date') {
  const filter = {};
  if (query.from || query.to) {
    filter[field] = {};
    if (query.from) filter[field].$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      filter[field].$lte = to;
    }
  }
  return filter;
}
