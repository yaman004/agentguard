import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Action } from '../models/Action';
import { TOOLS } from '../services/tools/registry';
import { Types } from 'mongoose';

export const listTools = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const since = new Date(Date.now() - 24 * 3600_000);
  const usage = await Action.aggregate([
    { $match: { organizationId: new Types.ObjectId(orgId) } },
    { $group: { _id: '$tool', total: { $sum: 1 }, last24h: { $sum: { $cond: [{ $gte: ['$timestamp', since] }, 1, 0] } }, blocked: { $sum: { $cond: [{ $eq: ['$status', 'BLOCKED'] }, 1, 0] } } } },
  ]);
  const byTool = new Map(usage.map((u) => [u._id, u]));
  res.json({
    items: Object.values(TOOLS).map((t) => ({
      name: t.name, label: t.label, description: t.description, sensitivity: t.sensitivity, actions: Object.keys(t.actions),
      usage: { total: byTool.get(t.name)?.total ?? 0, last24h: byTool.get(t.name)?.last24h ?? 0, blocked: byTool.get(t.name)?.blocked ?? 0 },
    })),
  });
});
