import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/securityEvents.controller';

const r = Router();
r.get('/', requirePermission('security:read'), validate({ query: c.listQuery }), c.listEvents);
r.get('/:id', requirePermission('security:read'), validate({ params: idParams }), c.getEvent);
r.patch('/:id', requirePermission('security:write'), validate({ params: idParams, body: c.updateBody }), c.updateEvent);
r.post('/:id/notes', requirePermission('security:write'), validate({ params: idParams, body: c.noteBody }), c.addNote);
r.post('/:id/explain', requirePermission('security:read'), validate({ params: idParams }), c.explain);
export default r;
