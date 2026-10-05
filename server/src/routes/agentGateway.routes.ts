import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAgentKey } from '../middleware/agentAuth';
import { gatewayLimiter } from '../middleware/rateLimit';
import * as c from '../controllers/actions.controller';

const r = Router();
r.post('/', gatewayLimiter, requireAgentKey, validate({ body: c.gatewaySchema }), c.submitAgentAction);
export default r;
