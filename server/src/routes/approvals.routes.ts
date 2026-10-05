import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/approvals.controller';

const r = Router();
r.get('/', requirePermission('approvals:read'), validate({ query: c.listApprovalsQuery }), c.listApprovals);
r.get('/:id', requirePermission('approvals:read'), validate({ params: idParams }), c.getApproval);
r.post('/:id/approve', requirePermission('approvals:decide'), validate({ params: idParams, body: c.decisionBody }), c.approve);
r.post('/:id/reject', requirePermission('approvals:decide'), validate({ params: idParams, body: c.decisionBody }), c.reject);
export default r;
