import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, escapeRegex, HttpError } from '../utils/http.js';

// Builds standard list/get/create/update/delete routes for a simple model.
export function crudRouter(Model, {
  resource,
  searchFields = ['name'],
  sort = { createdAt: -1 },
  readOnlyFields = [],
  populate,
  listFilter, // (query) => extra Mongo filter for the list route
  onCreate, // (data, req) => data before insert
  beforeDelete,
  extend, // (router, { read, write }) => register extra routes before the /:id routes
} = {}) {
  const router = Router();
  const read = authorize(`${resource}:read`);
  const write = authorize(`${resource}:write`);
  if (extend) extend(router, { read, write });

  const clean = (body) => {
    const data = { ...body };
    ['_id', 'createdAt', 'updatedAt', ...readOnlyFields].forEach((f) => delete data[f]);
    return data;
  };

  router.get('/', read, asyncHandler(async (req, res) => {
    const filter = listFilter ? listFilter(req.query) : {};
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    let q = Model.find(filter).sort(sort).limit(Number(req.query.limit) || 500);
    if (populate) q = q.populate(populate);
    const items = await q;
    res.json(items);
  }));

  router.get('/:id', read, asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new HttpError(404, 'errors.notFound');
    res.json(item);
  }));

  router.post('/', write, asyncHandler(async (req, res) => {
    const data = clean(req.body);
    const item = await Model.create(onCreate ? onCreate(data, req) : data);
    res.status(201).json(item);
  }));

  router.put('/:id', write, asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, clean(req.body), { new: true, runValidators: true });
    if (!item) throw new HttpError(404, 'errors.notFound');
    res.json(item);
  }));

  router.delete('/:id', write, asyncHandler(async (req, res) => {
    if (beforeDelete) await beforeDelete(req.params.id);
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) throw new HttpError(404, 'errors.notFound');
    res.json({ message: req.t('msg.deleted') });
  }));

  return router;
}
