import { Router } from 'express';
import { z } from 'zod';
import { authOf, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Agent } from '../models/Agent';
import { processAgentAction } from '../services/gateway/gateway.service';
import { toAgentContext } from '../services/agents/context';
import { asyncHandler } from '../utils/asyncHandler';
import { conflict, notFound } from '../utils/errors';
import { gatewaySchema } from '../controllers/actions.controller';
import { objectId } from '../utils/schemas';

const r = Router();
/**
 * Dashboard-side simulator: runs the REAL gateway pipeline (policies, risk, approvals, tools,
 * audit, sockets) on behalf of one of the org's agents, so no API key is needed in the browser.
 */
r.post('/simulate', requirePermission('evaluations:write'), validate({ body: gatewaySchema.extend({ agentId: objectId }) }),
  asyncHandler(async (req, res) => {
    const a = authOf(req);
    const { agentId, ...body } = req.body;
    const agent = await Agent.findOne({ _id: agentId, organizationId: a.orgId });
    if (!agent) throw notFound('Agent not found');
    if (agent.status !== 'ACTIVE') throw conflict(`Agent is ${agent.status.toLowerCase()}`);
    const out = await processAgentAction(toAgentContext(agent), body, req, { simulatedBy: a.userId });
    res.json(out);
  }));
export default r;
