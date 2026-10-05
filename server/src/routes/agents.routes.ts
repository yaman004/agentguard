import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import { idParams } from '../utils/schemas';
import * as c from '../controllers/agents.controller';

const r = Router();
r.get('/', requirePermission('agents:read'), validate({ query: c.listAgentsQuery }), c.listAgents);
r.post('/', requirePermission('agents:write'), validate({ body: c.createAgentSchema }), c.createAgent);
r.get('/:id', requirePermission('agents:read'), validate({ params: idParams }), c.getAgent);
r.patch('/:id', requirePermission('agents:write'), validate({ params: idParams, body: c.updateAgentSchema }), c.updateAgent);
r.post('/:id/status', requirePermission('agents:write'), validate({ params: idParams, body: c.statusSchema }), c.setAgentStatus);
r.post('/:id/rotate-key', requirePermission('agents:write'), validate({ params: idParams }), c.rotateKey);
export default r;
