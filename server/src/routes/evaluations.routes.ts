import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/evaluations.controller';

const r = Router();
r.get('/cases', requirePermission('evaluations:read'), c.listCases);
r.post('/cases', requirePermission('evaluations:write'), validate({ body: c.caseSchema }), c.createCase);
r.delete('/cases/:id', requirePermission('evaluations:write'), validate({ params: idParams }), c.deleteCase);
r.get('/runs', requirePermission('evaluations:read'), validate({ query: c.runsQuery }), c.listRuns);
r.post('/runs', requirePermission('evaluations:write'), validate({ body: c.runBody }), c.startRun);
r.get('/runs/:id', requirePermission('evaluations:read'), validate({ params: idParams }), c.getRun);
export default r;
