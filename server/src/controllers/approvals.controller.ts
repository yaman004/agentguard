import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Approval } from '../models/Approval';
import { decideApproval } from '../services/approvals/approval.service';
import { APPROVAL_STATUSES } from '../types';
import { notFound } from '../utils/errors';
import { pagination } from '../utils/schemas';

export const listApprovalsQuery = z.object({ ...pagination, status: z.enum(APPROVAL_STATUSES).optional() });
export const decisionBody = z.object({ note: z.string().trim().max(500).optional() });

const populate = (q: any) => q.populate('agentId', 'name environment').populate('actionId', 'actionType tool parameters status result riskBreakdown aiAnalysis');

export const listApprovals = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, status } = req.query as any;
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    populate(Approval.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    Approval.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

export const getApproval = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const approval = await populate(Approval.findOne({ _id: req.params.id, organizationId: orgId })).lean();
  if (!approval) throw notFound('Approval not found');
  res.json({ approval });
});

const decide = (decision: 'APPROVE' | 'REJECT') => asyncHandler(async (req, res) => {
  const a = authOf(req);
  const { approval, action } = await decideApproval(a.orgId, String(req.params.id), { userId: a.userId, role: a.role }, decision, req.body.note, req);
  res.json({ approval, action });
});
export const approve = decide('APPROVE');
export const reject = decide('REJECT');
