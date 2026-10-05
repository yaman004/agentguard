import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import * as c from '../controllers/org.controller';

const r = Router();
r.get('/', c.getOrg);
r.get('/members', c.members);
r.post('/members', requirePermission('org:manage_members'), validate({ body: c.addMemberBody }), c.addMember);
r.patch('/members/:userId', requirePermission('org:manage_members'), validate({ params: c.memberParams, body: c.roleBody }), c.changeRole);
r.delete('/members/:userId', requirePermission('org:manage_members'), validate({ params: c.memberParams }), c.removeMember);
export default r;
