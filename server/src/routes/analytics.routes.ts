import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/analytics.controller';

const r = Router();
r.get('/', requirePermission('analytics:read'), validate({ query: c.analyticsQuery }), c.overview);
r.get('/agents/:id', requirePermission('analytics:read'), validate({ params: idParams, query: c.analyticsQuery }), c.agentStats);
export default r;
