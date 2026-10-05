import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requirePermission } from '../middleware/auth';
import * as c from '../controllers/audit.controller';

const r = Router();
r.get('/', requirePermission('audit:read'), validate({ query: c.auditQuery }), c.listAuditLogs);
export default r;
