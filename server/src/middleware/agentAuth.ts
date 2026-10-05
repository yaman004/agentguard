import type { RequestHandler } from 'express';
import { ApiKey } from '../models/ApiKey';
import { Agent } from '../models/Agent';
import { hashApiKey, parseApiKey, safeEqualHex } from '../utils/crypto';
import { AppError, unauthorized } from '../utils/errors';

/** Authenticates `Authorization: Bearer agk_...` and attaches the agent + organization to the request. */
export const requireAgentKey: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get('authorization') ?? '';
    const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const parsed = parseApiKey(key);
    if (!parsed) throw unauthorized('Invalid API key');

    const record = await ApiKey.findOne({ prefix: parsed.prefix, revokedAt: null }).select('+hash');
    // Same error for unknown prefix and wrong secret: no oracle for key enumeration.
    if (!record || !safeEqualHex(record.hash, hashApiKey(key))) throw unauthorized('Invalid API key');

    const agent = await Agent.findOne({ _id: record.agentId, organizationId: record.organizationId });
    if (!agent) throw unauthorized('Invalid API key');
    if (agent.status !== 'ACTIVE') {
      throw new AppError(403, 'AGENT_INACTIVE', `Agent is ${agent.status.toLowerCase()}`);
    }

    req.agent = {
      id: String(agent._id),
      orgId: String(agent.organizationId),
      ownerId: String(agent.ownerId),
      name: agent.name,
      environment: agent.environment,
      permissions: agent.permissions,
      allowedTools: agent.allowedTools,
    };
    ApiKey.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    next();
  } catch (e) {
    next(e);
  }
};
