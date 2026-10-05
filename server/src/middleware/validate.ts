import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

export const validate =
  (schemas: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) (req as any).query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (e) {
      next(e); // ZodError -> 400 in errorHandler
    }
  };
