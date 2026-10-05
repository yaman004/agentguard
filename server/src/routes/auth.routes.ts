import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import * as c from '../controllers/auth.controller';

const r = Router();
r.post('/register', authLimiter, validate({ body: c.registerSchema }), c.register);
r.post('/login', authLimiter, validate({ body: c.loginSchema }), c.login);
r.post('/refresh', authLimiter, c.refresh);
r.post('/logout', c.logout);
r.get('/me', requireAuth, c.me);
r.get('/socket-token', requireAuth, c.socketToken);
export default r;
