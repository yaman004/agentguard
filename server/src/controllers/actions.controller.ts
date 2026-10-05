import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Action } from '../models/Action';
import { ACTION_STATUSES, DECISIONS, RISK_LEVELS } from '../types';
import { notFound, unauthorized } from '../utils/errors';
import { objectId, pagination } from '../utils/schemas';
import { processAgentAction } from '../services/gateway/gateway.service';

// ---- Agent-facing gateway: POST /api/agent-actions ----
export const gatewaySchema = z.object({
  actionType: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/, 'Use snake_case, e.g. refund_customer'),
  tool: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/, 'Use snake_case, e.g. payment_api'),
  parameters: z.record(z.unknown()).default({}),
  userContext: z.record(z.unknown()).optional(),
});

export const submitAgentAction = asyncHandler(async (req, res) => {
  if (!req.agent) throw unauthorized();
  const out = await processAgentAction(req.agent, req.body, req);
  const http = out.decision === 'ALLOW' ? 200 : out.decision === 'REQUIRES_APPROVAL' ? 202 : 403;
  res.status(http).json(out);
});

// ---- Dashboard-facing reads ----
export const listActionsQuery = z.object({
  ...pagination,
  agentId: objectId.optional(),
  status: z.enum(ACTION_STATUSES).optional(),
  decision: z.enum(DECISIONS).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  actionType: z.string().trim().max(80).optional(),
});

export const listActions = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, agentId, status, decision, riskLevel, actionType } = req.query as any;
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (agentId) filter.agentId = agentId;
  if (status) filter.status = status;
  if (decision) filter.policyDecision = decision;
  if (riskLevel) filter.riskLevel = riskLevel;
  if (actionType) filter.actionType = actionType;
  const [items, total] = await Promise.all([
    Action.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).populate('agentId', 'name').lean(),
    Action.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

export const getAction = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const action = await Action.findOne({ _id: req.params.id, organizationId: orgId }).populate('agentId', 'name').lean();
  if (!action) throw notFound('Action not found');
  res.json({ action });
});
