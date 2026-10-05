import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ACCESS_COOKIE, type AccessPayload } from '../services/auth/auth.service';
import { forbidden, unauthorized } from '../utils/errors';
import { can, type Permission } from '../utils/rbac';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(unauthorized());
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    req.auth = { userId: p.sub, orgId: p.org, role: p.role };
    next();
  } catch {
    next(unauthorized('Invalid or expired session'));
  }
};

export const requirePermission =
  (perm: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!can(req.auth.role, perm)) return next(forbidden(`Requires permission: ${perm}`));
    next();
  };

/** Handler-side accessor so controllers never need non-null assertions. */
export function authOf(req: Express.Request) {
  if (!req.auth) throw unauthorized();
  return req.auth;
}

/**
 * CSRF defence for cookie-authenticated, state-changing requests. Browsers cannot attach a custom
 * header cross-site without a CORS preflight, which our CORS policy only allows for CLIENT_ORIGIN.
 */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-agentguard-client') !== 'web') return next(forbidden('Missing client header'));
  next();
};
