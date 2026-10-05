import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Membership } from '../models/Membership';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { recordAudit } from '../services/audit/audit.service';
import { ROLES } from '../types';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { objectId } from '../utils/schemas';

const assignable = ROLES.filter((r) => r !== 'OWNER') as [string, ...string[]];
export const addMemberBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(128),
  role: z.enum(assignable),
});
export const roleBody = z.object({ role: z.enum(assignable) });
export const memberParams = z.object({ userId: objectId });

const listMembers = async (orgId: string) => {
  const ms = await Membership.find({ organizationId: orgId }).sort({ createdAt: 1 }).populate('userId', 'name email').lean();
  return ms.filter((m) => m.userId).map((m: any) => ({ userId: String(m.userId._id), name: m.userId.name, email: m.userId.email, role: m.role, joinedAt: m.createdAt }));
};

export const getOrg = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const org = await Organization.findById(a.orgId).lean();
  if (!org) throw notFound('Organization not found');
  res.json({ organization: { id: String(org._id), name: org.name, slug: org.slug, createdAt: org.createdAt }, members: await listMembers(a.orgId) });
});

export const members = asyncHandler(async (req, res) => {
  res.json({ items: await listMembers(authOf(req).orgId) });
});

export const addMember = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) throw conflict('A user with this email already exists');
  const user = await User.create({ email, name: req.body.name, passwordHash: await bcrypt.hash(req.body.password, 12) });
  await Membership.create({ userId: user._id, organizationId: a.orgId, role: req.body.role });
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'member.added', metadata: { email, role: req.body.role }, req });
  res.status(201).json({ items: await listMembers(a.orgId) });
});

async function guardTarget(orgId: string, userId: string, selfId: string) {
  const m = await Membership.findOne({ organizationId: orgId, userId });
  if (!m) throw notFound('Member not found');
  if (m.role === 'OWNER') throw forbidden('The organization owner cannot be modified');
  if (userId === selfId) throw badRequest('You cannot change your own membership');
  return m;
}

export const changeRole = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const m = await guardTarget(a.orgId, String(req.params.userId), a.userId);
  const from = m.role;
  m.role = req.body.role;
  await m.save();
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'member.role_changed', metadata: { userId: String(m.userId), from, to: m.role }, req });
  res.json({ items: await listMembers(a.orgId) });
});

export const removeMember = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const m = await guardTarget(a.orgId, String(req.params.userId), a.userId);
  await m.deleteOne();
  await User.updateOne({ _id: m.userId }, { $inc: { tokenVersion: 1 } }); // kill their refresh tokens
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'member.removed', metadata: { userId: String(m.userId) }, req });
  res.json({ items: await listMembers(a.orgId) });
});
