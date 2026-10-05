import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authOf } from '../middleware/auth';
import { Agent } from '../models/Agent';
import { ApiKey } from '../models/ApiKey';
import { agentDto, issueApiKey, revokeAgentKeys } from '../services/agents/agent.service';
import { recordAudit } from '../services/audit/audit.service';
import { AGENT_STATUSES, ENVIRONMENTS } from '../types';
import { notFound } from '../utils/errors';
import { emitToOrg } from '../sockets';
import { escapeRegex, pagination } from '../utils/schemas';

const stringList = z.array(z.string().trim().min(1).max(80)).max(100);

export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(''),
  environment: z.enum(ENVIRONMENTS).default('DEVELOPMENT'),
  permissions: stringList.default([]),
  allowedTools: stringList.default([]),
});
export const updateAgentSchema = createAgentSchema.partial().refine((v) => Object.keys(v).length > 0, 'No fields to update');
export const statusSchema = z.object({ status: z.enum(AGENT_STATUSES) });
export const listAgentsQuery = z.object({
  ...pagination,
  status: z.enum(AGENT_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
});

async function findOwned(req: Express.Request & { params: any }) {
  const a = authOf(req);
  const agent = await Agent.findOne({ _id: req.params.id, organizationId: a.orgId }); // org isolation
  if (!agent) throw notFound('Agent not found');
  return { agent, a };
}

export const listAgents = asyncHandler(async (req, res) => {
  const { orgId } = authOf(req);
  const { page, limit, status, q } = req.query as any;
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (status) filter.status = status;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const [items, total] = await Promise.all([
    Agent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Agent.countDocuments(filter),
  ]);
  res.json({ items: items.map(agentDto), total, page, limit });
});

export const createAgent = asyncHandler(async (req, res) => {
  const a = authOf(req);
  const agent = await Agent.create({ ...req.body, organizationId: a.orgId, ownerId: a.userId });
  const key = await issueApiKey(a.orgId, String(agent._id), a.userId);
  await recordAudit({
    organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: String(agent._id),
    action: 'agent.created', metadata: { name: agent.name, keyPrefix: key.prefix }, req,
  });
  // The plaintext key is returned exactly once.
  res.status(201).json({ agent: agentDto(agent), apiKey: key.apiKey, apiKeyNotice: 'Store this key now; it will not be shown again.' });
});

export const getAgent = asyncHandler(async (req, res) => {
  const { agent, a } = await findOwned(req);
  const keys = await ApiKey.find({ organizationId: a.orgId, agentId: agent._id, revokedAt: null }).lean();
  res.json({
    agent: agentDto(agent),
    apiKeys: keys.map((k) => ({ id: String(k._id), prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt ?? null })),
  });
});

export const updateAgent = asyncHandler(async (req, res) => {
  const { agent, a } = await findOwned(req);
  agent.set(req.body);
  await agent.save();
  await recordAudit({
    organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: String(agent._id),
    action: 'agent.updated', metadata: { fields: Object.keys(req.body) }, req,
  });
  res.json({ agent: agentDto(agent) });
});

export const setAgentStatus = asyncHandler(async (req, res) => {
  const { agent, a } = await findOwned(req);
  const previous = agent.status;
  agent.status = req.body.status;
  await agent.save();
  await recordAudit({
    organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: String(agent._id),
    action: 'agent.status_changed', metadata: { from: previous, to: agent.status }, req,
  });
  emitToOrg(a.orgId, 'agent_status_changed', { id: String(agent._id), name: agent.name, from: previous, to: agent.status });
  res.json({ agent: agentDto(agent) });
});

export const rotateKey = asyncHandler(async (req, res) => {
  const { agent, a } = await findOwned(req);
  await revokeAgentKeys(a.orgId, String(agent._id));
  const key = await issueApiKey(a.orgId, String(agent._id), a.userId);
  await recordAudit({
    organizationId: a.orgId, actorType: 'USER', actorId: a.userId, agentId: String(agent._id),
    action: 'agent.key_rotated', metadata: { newKeyPrefix: key.prefix }, req,
  });
  res.json({ apiKey: key.apiKey, apiKeyNotice: 'Previous keys are revoked. Store this key now; it will not be shown again.' });
});
