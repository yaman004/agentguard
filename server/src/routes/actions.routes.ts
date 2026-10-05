import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/actions.controller';

const r = Router();
r.get('/', requirePermission('actions:read'), validate({ query: c.listActionsQuery }), c.listActions);
r.get('/:id', requirePermission('actions:read'), validate({ params: idParams }), c.getAction);
export default r;
