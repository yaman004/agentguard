/** Hand-maintained OpenAPI 3 spec served at /api/docs. */
const json = (schema: any) => ({ 'application/json': { schema } });
const ok = (description = 'OK') => ({ description });
const cookie = [{ cookieAuth: [] }];
const q = (name: string, description = '', type = 'string') => ({ name, in: 'query', description, schema: { type } });
const idp = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const body = (schema: any) => ({ required: true, content: json(schema) });
const obj = (properties: any, required: string[] = []) => ({ type: 'object', properties, required });
const S = { type: 'string' }, N = { type: 'number' }, B = { type: 'boolean' };
const arr = (items: any) => ({ type: 'array', items });
const page = [q('page', '', 'integer'), q('limit', 'max 100', 'integer')];

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'AgentGuard API', version: '1.0.0',
    description: 'AI agent security, governance and observability. Dashboard routes use HTTP-only cookie auth (state-changing requests must send `X-AgentGuard-Client: web`). The agent gateway uses `Authorization: Bearer agk_...`.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'ag_access' },
      agentKey: { type: 'http', scheme: 'bearer', description: 'Agent API key (agk_...)' },
    },
    schemas: {
      Error: obj({ error: obj({ code: S, message: S, details: {} }) }),
      GatewayRequest: obj({ actionType: S, tool: S, parameters: { type: 'object' }, userContext: { type: 'object' } }, ['actionType', 'tool']),
      GatewayResponse: obj({
        actionId: S, approvalId: S, decision: { type: 'string', enum: ['ALLOW', 'BLOCK', 'REQUIRES_APPROVAL'] }, status: S, reason: S,
        riskScore: N, riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, riskBreakdown: arr(obj({ factor: S, points: N })),
        matchedPolicies: arr({ type: 'object' }), result: {}, trace: arr(obj({ step: S, outcome: S, detail: {}, ms: N })),
      }),
    },
  },
  tags: ['Authentication', 'Agents', 'Policies', 'Actions', 'Approvals', 'Security events', 'Audit logs', 'Evaluations', 'Analytics', 'Organization', 'Tools'].map((name) => ({ name })),
  paths: {
    '/api/auth/register': { post: { tags: ['Authentication'], summary: 'Create user + organization (OWNER)', requestBody: body(obj({ name: S, email: S, password: S, organizationName: S }, ['name', 'email', 'password', 'organizationName'])), responses: { 201: ok('Registered, cookies set'), 409: ok('Email exists') } } },
    '/api/auth/login': { post: { tags: ['Authentication'], summary: 'Log in (sets HTTP-only cookies)', requestBody: body(obj({ email: S, password: S }, ['email', 'password'])), responses: { 200: ok(), 401: ok('Invalid credentials') } } },
    '/api/auth/refresh': { post: { tags: ['Authentication'], summary: 'Rotate access token using refresh cookie', responses: { 200: ok(), 401: ok() } } },
    '/api/auth/logout': { post: { tags: ['Authentication'], summary: 'Log out and revoke refresh tokens', responses: { 200: ok() } } },
    '/api/auth/me': { get: { tags: ['Authentication'], summary: 'Current user, organization and role', security: cookie, responses: { 200: ok(), 401: ok() } } },
    '/api/auth/socket-token': { get: { tags: ['Authentication'], summary: '60s token for the Socket.IO handshake', security: cookie, responses: { 200: ok() } } },

    '/api/agents': {
      get: { tags: ['Agents'], summary: 'List agents', security: cookie, parameters: [...page, q('status'), q('q', 'name search')], responses: { 200: ok() } },
      post: { tags: ['Agents'], summary: 'Create agent; API key returned ONCE', security: cookie, requestBody: body(obj({ name: S, description: S, environment: S, permissions: arr(S), allowedTools: arr(S) }, ['name'])), responses: { 201: ok() } },
    },
    '/api/agents/{id}': {
      get: { tags: ['Agents'], summary: 'Agent + active key prefixes', security: cookie, parameters: [idp], responses: { 200: ok(), 404: ok() } },
      patch: { tags: ['Agents'], summary: 'Edit description, permissions, tools, environment', security: cookie, parameters: [idp], requestBody: body({ type: 'object' }), responses: { 200: ok() } },
    },
    '/api/agents/{id}/status': { post: { tags: ['Agents'], summary: 'Set ACTIVE / DISABLED / SUSPENDED', security: cookie, parameters: [idp], requestBody: body(obj({ status: S }, ['status'])), responses: { 200: ok() } } },
    '/api/agents/{id}/rotate-key': { post: { tags: ['Agents'], summary: 'Revoke old keys, issue a new one', security: cookie, parameters: [idp], responses: { 200: ok() } } },

    '/api/policies': {
      get: { tags: ['Policies'], summary: 'List policies', security: cookie, responses: { 200: ok() } },
      post: { tags: ['Policies'], summary: 'Create policy', security: cookie, requestBody: body(obj({ name: S, actionType: S, tool: S, effect: { type: 'string', enum: ['BLOCK', 'REQUIRE_APPROVAL'] }, conditions: obj({ maxAmount: N, allowedAgentIds: arr(S) }), enabled: B }, ['name', 'actionType', 'effect'])), responses: { 201: ok() } },
    },
    '/api/policies/{id}': {
      get: { tags: ['Policies'], summary: 'Get policy', security: cookie, parameters: [idp], responses: { 200: ok() } },
      patch: { tags: ['Policies'], summary: 'Update / enable / disable', security: cookie, parameters: [idp], requestBody: body({ type: 'object' }), responses: { 200: ok() } },
      delete: { tags: ['Policies'], summary: 'Delete policy', security: cookie, parameters: [idp], responses: { 204: ok() } },
    },

    '/api/agent-actions': {
      post: {
        tags: ['Actions'], summary: 'Agent gateway: evaluate (and possibly execute) an action', security: [{ agentKey: [] }],
        description: '200 = ALLOW (executed), 202 = REQUIRES_APPROVAL (pending), 403 = BLOCK. All carry the decision body.',
        requestBody: body({ $ref: '#/components/schemas/GatewayRequest' }),
        responses: { 200: { description: 'Allowed', content: json({ $ref: '#/components/schemas/GatewayResponse' }) }, 202: ok('Approval required'), 401: ok('Bad API key'), 403: ok('Blocked or agent inactive'), 429: ok('Rate limited') },
      },
    },
    '/api/actions': { get: { tags: ['Actions'], summary: 'List actions', security: cookie, parameters: [...page, q('agentId'), q('status'), q('decision'), q('riskLevel'), q('actionType')], responses: { 200: ok() } } },
    '/api/actions/{id}': { get: { tags: ['Actions'], summary: 'Action detail', security: cookie, parameters: [idp], responses: { 200: ok() } } },
    '/api/demo/simulate': { post: { tags: ['Actions'], summary: 'Run the real gateway pipeline as one of your agents (Demo page)', security: cookie, requestBody: body(obj({ agentId: S, actionType: S, tool: S, parameters: { type: 'object' } }, ['agentId', 'actionType', 'tool'])), responses: { 200: ok() } } },

    '/api/approvals': { get: { tags: ['Approvals'], summary: 'List approvals', security: cookie, parameters: [...page, q('status')], responses: { 200: ok() } } },
    '/api/approvals/{id}': { get: { tags: ['Approvals'], summary: 'Approval detail', security: cookie, parameters: [idp], responses: { 200: ok() } } },
    '/api/approvals/{id}/approve': { post: { tags: ['Approvals'], summary: 'Approve and execute the tool call', security: cookie, parameters: [idp], requestBody: body(obj({ note: S })), responses: { 200: ok(), 403: ok('Role cannot decide / CRITICAL needs Admin'), 409: ok('Already decided or expired') } } },
    '/api/approvals/{id}/reject': { post: { tags: ['Approvals'], summary: 'Reject', security: cookie, parameters: [idp], requestBody: body(obj({ note: S })), responses: { 200: ok() } } },

    '/api/security-events': { get: { tags: ['Security events'], summary: 'List events', security: cookie, parameters: [...page, q('severity'), q('status'), q('type'), q('agentId')], responses: { 200: ok() } } },
    '/api/security-events/{id}': {
      get: { tags: ['Security events'], summary: 'Event detail', security: cookie, parameters: [idp], responses: { 200: ok() } },
      patch: { tags: ['Security events'], summary: 'Change status / assign', security: cookie, parameters: [idp], requestBody: body(obj({ status: S, assigneeId: S })), responses: { 200: ok() } },
    },
    '/api/security-events/{id}/notes': { post: { tags: ['Security events'], summary: 'Add investigation note', security: cookie, parameters: [idp], requestBody: body(obj({ text: S }, ['text'])), responses: { 201: ok() } } },
    '/api/security-events/{id}/explain': { post: { tags: ['Security events'], summary: 'AI explanation (needs OPENAI_API_KEY)', security: cookie, parameters: [idp], responses: { 200: ok(), 400: ok('AI unavailable') } } },

    '/api/audit-logs': { get: { tags: ['Audit logs'], summary: 'Read-only audit trail', security: cookie, parameters: [...page, q('agentId'), q('riskLevel'), q('action'), q('from', 'ISO date'), q('to', 'ISO date'), q('q', 'search')], responses: { 200: ok() } } },

    '/api/evaluations/cases': {
      get: { tags: ['Evaluations'], summary: 'List test cases', security: cookie, responses: { 200: ok() } },
      post: { tags: ['Evaluations'], summary: 'Create test case', security: cookie, requestBody: body(obj({ name: S, actionType: S, tool: S, parameters: { type: 'object' }, expectedDecision: S, agentId: S }, ['name', 'actionType', 'tool', 'expectedDecision'])), responses: { 201: ok() } },
    },
    '/api/evaluations/cases/{id}': { delete: { tags: ['Evaluations'], summary: 'Delete test case', security: cookie, parameters: [idp], responses: { 204: ok() } } },
    '/api/evaluations/runs': {
      get: { tags: ['Evaluations'], summary: 'List runs', security: cookie, parameters: [...page, q('agentId')], responses: { 200: ok() } },
      post: { tags: ['Evaluations'], summary: 'Start a suite run (async job)', security: cookie, requestBody: body(obj({ agentId: S }, ['agentId'])), responses: { 202: ok() } },
    },
    '/api/evaluations/runs/{id}': { get: { tags: ['Evaluations'], summary: 'Run results', security: cookie, parameters: [idp], responses: { 200: ok() } } },

    '/api/analytics': { get: { tags: ['Analytics'], summary: 'Dashboard metrics + chart series from MongoDB', security: cookie, parameters: [q('days', '1-90', 'integer')], responses: { 200: ok() } } },
    '/api/analytics/agents/{id}': { get: { tags: ['Analytics'], summary: 'Per-agent activity and risk trend', security: cookie, parameters: [idp, q('days', '', 'integer')], responses: { 200: ok() } } },
    '/api/tools': { get: { tags: ['Tools'], summary: 'Registered tools + usage', security: cookie, responses: { 200: ok() } } },
    '/api/org': { get: { tags: ['Organization'], summary: 'Organization and members', security: cookie, responses: { 200: ok() } } },
    '/api/org/members': { post: { tags: ['Organization'], summary: 'Add member (OWNER only)', security: cookie, requestBody: body(obj({ name: S, email: S, password: S, role: S }, ['name', 'email', 'password', 'role'])), responses: { 201: ok() } } },
    '/api/org/members/{userId}': {
      patch: { tags: ['Organization'], summary: 'Change role (OWNER only)', security: cookie, parameters: [{ name: 'userId', in: 'path', required: true, schema: S }], requestBody: body(obj({ role: S })), responses: { 200: ok() } },
      delete: { tags: ['Organization'], summary: 'Remove member (OWNER only)', security: cookie, parameters: [{ name: 'userId', in: 'path', required: true, schema: S }], responses: { 200: ok() } },
    },
  },
} as const;
