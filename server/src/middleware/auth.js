import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { hasPermission } from '../config/permissions.js';
import { HttpError } from '../utils/http.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const user = await User.findById(payload.id);
    if (!user || !user.active) throw new HttpError(401, 'Account not found or disabled');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const authorize = (...permissions) => (req, res, next) => {
  const ok = permissions.some((p) => hasPermission(req.user.role, p));
  if (!ok) return next(new HttpError(403, 'You do not have permission to perform this action'));
  next();
};
