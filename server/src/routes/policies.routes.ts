import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/policies.controller';

const r = Router();
r.get('/', requirePermission('policies:read'), c.listPolicies);
r.post('/', requirePermission('policies:write'), validate({ body: c.policySchema }), c.createPolicy);
r.get('/:id', requirePermission('policies:read'), validate({ params: idParams }), c.getPolicy);
r.patch('/:id', requirePermission('policies:write'), validate({ params: idParams, body: c.updatePolicySchema }), c.updatePolicy);
r.delete('/:id', requirePermission('policies:write'), validate({ params: idParams }), c.deletePolicy);
export default r;
