import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Agent } from '../models/Agent';
import { Evaluation } from '../models/Evaluation';
import { EvaluationRun } from '../models/EvaluationRun';
import { enqueue } from '../queues';
import { recordAudit } from '../services/audit/audit.service';
import { DECISIONS } from '../types';
import { notFound } from '../utils/errors';
import { objectId, pagination } from '../utils/schemas';

export const caseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(''),
  actionType: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/),
  tool: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/),
  parameters: z.record(z.unknown()).default({}),
  expectedDecision: z.enum(DECISIONS),
  agentId: objectId.optional(),
});
export const runBody = z.object({ agentId: objectId });
export const runsQuery = z.object({ ...pagination, agentId: objectId.optional() });

export const listCases = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  res.json({ items: await Evaluation.find({ organizationId: orgId }).sort({ createdAt: 1 }).populate('agentId', 'name').lean() });
});

export const createCase = asyncHandler(async (req, res) => {
  const a = authOf(req);
  if (req.body.agentId && !(await Agent.exists({ _id: req.body.agentId, organizationId: a.orgId }))) throw notFound('Agent not found');
  const c = await Evaluation.create({ ...req.body, organizationId: a.orgId, createdBy: a.userId });
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'evaluation.case_created', metadata: { caseId: String(c._id), name: c.name }, req });
  res.status(201).json({ case: c });
});

export const deleteCase = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const c = await Evaluation.findOneAndDelete({ _id: req.params.id, organizationId: a.orgId });
  if (!c) throw notFound('Test case not found');
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, action: 'evaluation.case_deleted', metadata: { name: c.name }, req });
  res.status(204).end();
});

export const startRun = asyncHandler(async (req, res) => {
  const a = authOf(req);
  if (!(await Agent.exists({ _id: req.body.agentId, organizationId: a.orgId }))) throw notFound('Agent not found');
  const run = await EvaluationRun.create({ organizationId: a.orgId, agentId: req.body.agentId, triggeredBy: a.userId });
  await recordAudit({ organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: req.body.agentId, action: 'evaluation.run_started', metadata: { runId: String(run._id) }, req });
  await enqueue('evaluation-run', { runId: String(run._id) });
  res.status(202).json({ run });
});

export const listRuns = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, agentId } = req.query as any;
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (agentId) filter.agentId = agentId;
  const [items, total] = await Promise.all([
    EvaluationRun.find(filter).select('-results').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('agentId', 'name').lean(),
    EvaluationRun.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

export const getRun = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const run = await EvaluationRun.findOne({ _id: req.params.id, organizationId: orgId }).populate('agentId', 'name').lean();
  if (!run) throw notFound('Run not found');
  res.json({ run });
});
