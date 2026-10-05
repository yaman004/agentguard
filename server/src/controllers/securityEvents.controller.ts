import { Types } from 'mongoose';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { SecurityEvent } from '../models/SecurityEvent';
import { Membership } from '../models/Membership';
import { recordAudit } from '../services/audit/audit.service';
import { explainSecurityEvent } from '../services/ai/ai.service';
import { RISK_LEVELS, SECURITY_EVENT_TYPES, SECURITY_STATUSES } from '../types';
import { badRequest, notFound } from '../utils/errors';
import { objectId, pagination } from '../utils/schemas';

export const listQuery = z.object({
  ...pagination,
  severity: z.enum(RISK_LEVELS).optional(),
  status: z.enum(SECURITY_STATUSES).optional(),
  type: z.enum(SECURITY_EVENT_TYPES).optional(),
  agentId: objectId.optional(),
});
export const updateBody = z.object({
  status: z.enum(SECURITY_STATUSES).optional(),
  assigneeId: objectId.nullable().optional(),
}).refine((v) => v.status !== undefined || v.assigneeId !== undefined, 'Nothing to update');
export const noteBody = z.object({ text: z.string().trim().min(1).max(2000) });

export const listEvents = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, severity, status, type, agentId } = req.query as any;
  const filter: Record<string, unknown> = { organizationId: orgId };
  Object.entries({ severity, status, type, agentId }).forEach(([k, v]) => { if (v) filter[k] = v; });
  const [items, total, counts] = await Promise.all([
    SecurityEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('agentId', 'name').populate('assigneeId', 'name').lean(),
    SecurityEvent.countDocuments(filter),
    SecurityEvent.aggregate([{ $match: { organizationId: new Types.ObjectId(orgId), status: { $in: ['OPEN', 'INVESTIGATING'] } } }, { $group: { _id: '$severity', n: { $sum: 1 } } }]),
  ]);
  res.json({ items, total, page, limit, openBySeverity: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
});

export const getEvent = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const event = await SecurityEvent.findOne({ _id: req.params.id, organizationId: orgId })
    .populate('agentId', 'name').populate('assigneeId', 'name').populate('notes.authorId', 'name').populate('actionId').lean();
  if (!event) throw notFound('Security event not found');
  res.json({ event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const ev = await SecurityEvent.findOne({ _id: req.params.id, organizationId: a.orgId });
  if (!ev) throw notFound('Security event not found');
  if (req.body.assigneeId) {
    // Assignee must belong to the same organization.
    if (!(await Membership.exists({ userId: req.body.assigneeId, organizationId: a.orgId }))) throw badRequest('Assignee is not a member of this organization');
  }
  if (req.body.assigneeId !== undefined) ev.assigneeId = req.body.assigneeId;
  if (req.body.status) {
    ev.status = req.body.status;
    if (req.body.status === 'RESOLVED' || req.body.status === 'FALSE_POSITIVE') { ev.resolvedAt = new Date(); ev.resolvedBy = a.userId as any; }
  }
  await ev.save();
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: ev.agentId ? String(ev.agentId) : undefined, action: 'security_event.updated', metadata: { eventId: String(ev._id), ...req.body }, req });
  res.json({ event: ev });
});

export const addNote = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const ev = await SecurityEvent.findOneAndUpdate(
    { _id: req.params.id, organizationId: a.orgId },
    { $push: { notes: { authorId: a.userId, text: req.body.text, createdAt: new Date() } } }, { new: true }
  );
  if (!ev) throw notFound('Security event not found');
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'security_event.note_added', metadata: { eventId: String(ev._id) }, req });
  res.status(201).json({ event: ev });
});

export const explain = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const out = await explainSecurityEvent(String(req.params.id), orgId);
  if (!out) throw badRequest('AI explanation unavailable (OPENAI_API_KEY not configured, or the provider did not respond)');
  res.json({ aiExplanation: out });
});
