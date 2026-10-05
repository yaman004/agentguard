import { Types } from 'mongoose';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Action } from '../models/Action';
import { Agent } from '../models/Agent';
import { Approval } from '../models/Approval';
import { SecurityEvent } from '../models/SecurityEvent';
import { notFound } from '../utils/errors';

export const analyticsQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) });

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
function daysList(days: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(new Date(today.getTime() - i * 86400_000)));
  return out;
}
function fill<T extends Record<string, any>>(days: string[], rows: any[], keys: string[]): (T & { date: string })[] {
  const m = new Map(rows.map((r) => [r._id, r]));
  return days.map((date) => ({ date, ...Object.fromEntries(keys.map((k) => [k, m.get(date)?.[k] ?? 0])) })) as any;
}
const dayGroup = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };

export const overview = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { days } = req.query as any;
  const org = new Types.ObjectId(orgId);
  const since = new Date(Date.now() - days * 86400_000);
  const since24h = new Date(Date.now() - 86400_000);
  const list = daysList(days);
  const inRange = { organizationId: org, timestamp: { $gte: since } };
  const evRange = { organizationId: org, createdAt: { $gte: since } };
  const cnt = (dec: string) => ({ $sum: { $cond: [{ $eq: ['$policyDecision', dec] }, 1, 0] } });

  const [
    totalAgents, activeAgents, highRiskAgents, recentlyActive, actions24h, blocked, approvalsRange, pendingApprovals,
    violations, securityEvents, highRiskActions,
    activity, risk, byTool, byAgent, decisions, violationsByDay, secBySeverity, approvalsByDay, recentAgents,
  ] = await Promise.all([
    Agent.countDocuments({ organizationId: orgId }),
    Agent.countDocuments({ organizationId: orgId, status: 'ACTIVE' }),
    Agent.countDocuments({ organizationId: orgId, riskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
    Agent.countDocuments({ organizationId: orgId, lastSeenAt: { $gte: new Date(Date.now() - 3600_000) } }),
    Action.countDocuments({ organizationId: orgId, timestamp: { $gte: since24h } }),
    Action.countDocuments({ ...inRange, status: 'BLOCKED' }),
    Approval.countDocuments(evRange),
    Approval.countDocuments({ organizationId: orgId, status: 'PENDING' }),
    SecurityEvent.countDocuments({ ...evRange, type: { $in: ['POLICY_VIOLATION', 'UNAUTHORIZED_ACTION'] } }),
    SecurityEvent.countDocuments(evRange),
    Action.countDocuments({ ...inRange, riskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
    Action.aggregate([{ $match: inRange }, { $group: { _id: dayGroup, total: { $sum: 1 }, allowed: cnt('ALLOW'), blocked: cnt('BLOCK'), approval: cnt('REQUIRES_APPROVAL') } }]),
    Action.aggregate([{ $match: inRange }, { $group: { _id: '$riskLevel', value: { $sum: 1 } } }]),
    Action.aggregate([{ $match: inRange }, { $group: { _id: '$tool', value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 8 }]),
    Action.aggregate([
      { $match: inRange }, { $group: { _id: '$agentId', value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 8 },
      { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'a' } }, { $project: { value: 1, name: { $arrayElemAt: ['$a.name', 0] } } },
    ]),
    Action.aggregate([{ $match: inRange }, { $group: { _id: '$policyDecision', value: { $sum: 1 } } }]),
    SecurityEvent.aggregate([{ $match: { ...evRange, type: { $in: ['POLICY_VIOLATION', 'UNAUTHORIZED_ACTION', 'PROMPT_INJECTION'] } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, violations: { $sum: 1 } } }]),
    SecurityEvent.aggregate([{ $match: evRange }, { $group: { _id: '$severity', value: { $sum: 1 } } }]),
    Approval.aggregate([{ $match: evRange }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, created: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $in: ['$status', ['REJECTED', 'EXPIRED']] }, 1, 0] } } } }]),
    Agent.find({ organizationId: orgId, lastSeenAt: { $exists: true } }).sort({ lastSeenAt: -1 }).limit(5).select('name status riskLevel lastSeenAt').lean(),
  ]);

  const named = (rows: any[], order: string[]) => order.map((k) => ({ name: k, value: rows.find((r) => r._id === k)?.value ?? 0 }));
  res.json({
    days,
    summary: { totalAgents, activeAgents, highRiskAgents, recentlyActiveAgents: recentlyActive, actions24h, blockedActions: blocked, approvalRequests: approvalsRange, pendingApprovals, policyViolations: violations, securityEvents, highRiskActions },
    charts: {
      activity: fill(list, activity, ['total', 'allowed', 'blocked', 'approval']),
      riskDistribution: named(risk, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      byTool: byTool.map((t) => ({ name: t._id, value: t.value })),
      byAgent: byAgent.map((a) => ({ name: a.name ?? 'deleted', value: a.value })),
      decisionSplit: named(decisions, ['ALLOW', 'BLOCK', 'REQUIRES_APPROVAL']),
      violationsOverTime: fill(list, violationsByDay, ['violations']),
      securityBySeverity: named(secBySeverity, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      approvalTrend: fill(list, approvalsByDay, ['created', 'approved', 'rejected']),
    },
    recentAgents,
  });
});

export const agentStats = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { days } = req.query as any;
  const agent = await Agent.findOne({ _id: req.params.id, organizationId: orgId }).select('_id').lean();
  if (!agent) throw notFound('Agent not found');
  const match = { organizationId: new Types.ObjectId(orgId), agentId: agent._id, timestamp: { $gte: new Date(Date.now() - days * 86400_000) } };
  const rows = await Action.aggregate([{ $match: match }, { $group: { _id: dayGroup, total: { $sum: 1 }, avgRisk: { $avg: '$riskScore' }, blocked: { $sum: { $cond: [{ $eq: ['$status', 'BLOCKED'] }, 1, 0] } } } }]);
  const series = fill(daysList(days), rows, ['total', 'avgRisk', 'blocked']).map((r: any) => ({ ...r, avgRisk: Math.round(r.avgRisk) }));
  res.json({ series });
});
