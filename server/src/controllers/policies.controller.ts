import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Policy } from '../models/Policy';
import { recordAudit } from '../services/audit/audit.service';
import { POLICY_EFFECTS } from '../types';
import { notFound } from '../utils/errors';
import { objectId } from '../utils/schemas';

export const policySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(''),
  actionType: z.string().trim().min(1).max(80),
  tool: z.string().trim().min(1).max(80).optional(),
  effect: z.enum(POLICY_EFFECTS),
  conditions: z
    .object({
      maxAmount: z.number().nonnegative().optional(),
      allowedAgentIds: z.array(objectId).max(100).optional(),
    })
    .default({}),
  enabled: z.boolean().default(true),
});
export const updatePolicySchema = policySchema.partial().refine((v) => Object.keys(v).length > 0, 'No fields to update');

const dto = (p: any) => ({
  id: String(p._id), name: p.name, description: p.description, actionType: p.actionType, tool: p.tool ?? null,
  effect: p.effect, conditions: { maxAmount: p.conditions?.maxAmount ?? null, allowedAgentIds: p.conditions?.allowedAgentIds ?? null },
  enabled: p.enabled, createdAt: p.createdAt, updatedAt: p.updatedAt,
});

export const listPolicies = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const items = await Policy.find({ organizationId: orgId }).sort({ createdAt: -1 }).lean();
  res.json({ items: items.map(dto), total: items.length });
});

export const createPolicy = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const p = await Policy.create({ ...req.body, organizationId: a.orgId, createdBy: a.userId });
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'policy.created', metadata: { policyId: String(p._id), name: p.name }, req });
  res.status(201).json({ policy: dto(p) });
});

export const getPolicy = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const p = await Policy.findOne({ _id: req.params.id, organizationId: orgId });
  if (!p) throw notFound('Policy not found');
  res.json({ policy: dto(p) });
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const p = await Policy.findOne({ _id: req.params.id, organizationId: a.orgId });
  if (!p) throw notFound('Policy not found');
  p.set(req.body);
  await p.save();
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'policy.updated', metadata: { policyId: String(p._id), fields: Object.keys(req.body) }, req });
  res.json({ policy: dto(p) });
});

export const deletePolicy = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const p = await Policy.findOneAndDelete({ _id: req.params.id, organizationId: a.orgId });
  if (!p) throw notFound('Policy not found');
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'policy.deleted', metadata: { policyId: String(p._id), name: p.name }, req });
  res.status(204).end();
});
