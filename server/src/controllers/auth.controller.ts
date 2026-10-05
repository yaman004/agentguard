import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { authenticate, clearSession, issueSession, issueSocketToken, refreshSession, registerUser, REFRESH_COOKIE } from '../services/auth/auth.service';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Membership } from '../models/Membership';
import { notFound, unauthorized } from '../utils/errors';
import { recordAudit } from '../services/audit/audit.service';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  organizationName: z.string().trim().min(2).max(100),
});
export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });

const userDto = (u: any) => ({ id: String(u._id), name: u.name, email: u.email });
const orgDto = (o: any) => ({ id: String(o._id), name: o.name, slug: o.slug });

export const register = asyncHandler(async (req, res) => {
  const { user, org, role } = await registerUser(req.body);
  issueSession(res, { id: String(user._id), tokenVersion: user.tokenVersion }, String(org._id), role);
  await recordAudit({ organizationId: String(org._id), actorType: 'USER', actorId: String(user._id), action: 'auth.registered', req });
  res.status(201).json({ user: userDto(user), organization: orgDto(org), role });
});

export const login = asyncHandler(async (req, res) => {
  const { user, org, role } = await authenticate(req.body.email, req.body.password);
  issueSession(res, { id: String(user._id), tokenVersion: user.tokenVersion }, String(org._id), role);
  await recordAudit({ organizationId: String(org._id), actorType: 'USER', actorId: String(user._id), action: 'auth.login', req });
  res.json({ user: userDto(user), organization: orgDto(org), role });
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, orgId, role } = await refreshSession(req.cookies?.[REFRESH_COOKIE]);
  issueSession(res, { id: String(user._id), tokenVersion: user.tokenVersion }, orgId, role);
  res.json({ ok: true });
});

export const logout = asyncHandler(async (req, res) => {
  // Best effort: revoke refresh tokens if we can identify the user.
  try {
    const { user } = await refreshSession(req.cookies?.[REFRESH_COOKIE]);
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  } catch { /* already logged out / expired */ }
  clearSession(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const [user, org, membership] = await Promise.all([
    User.findById(a.userId),
    Organization.findById(a.orgId),
    Membership.findOne({ userId: a.userId, organizationId: a.orgId }),
  ]);
  if (!user || !org || !membership) throw unauthorized('Session no longer valid');
  res.json({ user: userDto(user), organization: orgDto(org), role: membership.role });
});

export const socketToken = asyncHandler(async (req, res) => {
  const a = authOf(req);
  res.json({ token: issueSocketToken(a.userId, a.orgId) });
});
