import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';
import { RISK_LEVELS } from '../types';
import { escapeRegex, objectId, pagination } from '../utils/schemas';

export const auditQuery = z.object({
  ...pagination,
  agentId: objectId.optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  action: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
});

// Read-only by design: there is no create/update/delete route for audit logs.
export const listAuditLogs = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, agentId, riskLevel, action, from, to, q } = req.query as any;
  const filter: Record<string, any> = { organizationId: orgId };
  if (agentId) filter.agentId = agentId;
  if (riskLevel) filter.riskLevel = riskLevel;
  if (action) filter.action = action;
  if (from || to) filter.timestamp = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ action: rx }, { tool: rx }, { actorId: rx }];
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});
