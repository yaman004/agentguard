export type Decision = 'ALLOW' | 'BLOCK' | 'REQUIRES_APPROVAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentGuardOptions {
  apiKey: string;
  /** Base URL of your AgentGuard deployment, e.g. https://api.yourcompany.com */
  baseUrl?: string;
  /** Abort a request after this many ms (default 15000). */
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface ActionRequest {
  type: string; // e.g. "refund_customer" — sent to the API as actionType
  tool: string; // e.g. "payment_api"
  parameters?: Record<string, unknown>;
  userContext?: Record<string, unknown>;
}

export interface TraceStep { step: string; outcome: string; detail?: unknown; ms: number }
export interface RiskFactor { factor: string; points: number }
export interface MatchedPolicy { policyId: string; name: string; effect: string; reason: string }

export interface ActionResult {
  actionId: string;
  approvalId?: string;
  decision: Decision;
  status: 'EXECUTED' | 'BLOCKED' | 'PENDING_APPROVAL' | 'REJECTED' | 'FAILED';
  reason: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskBreakdown: RiskFactor[];
  matchedPolicies: MatchedPolicy[];
  result: unknown;
  trace: TraceStep[];
}

export class AgentGuardError extends Error {
  constructor(message: string, public status: number, public code: string, public details?: unknown) {
    super(message);
    this.name = 'AgentGuardError';
  }
}

/** Thrown by `action()` when the gateway responds 403 BLOCK. Use `guard.evaluate()` to inspect instead of throwing. */
export class AgentGuardBlockedError extends AgentGuardError {
  constructor(public actionResult: ActionResult) {
    super(actionResult.reason, 403, 'BLOCKED', actionResult);
    this.name = 'AgentGuardBlockedError';
  }
}

/**
 * Official AgentGuard SDK. Every agent action goes through the gateway, which
 * enforces permissions and policy, scores risk, and either executes, blocks, or
 * routes the action for human approval before anything reaches a real system.
 *
 * @example
 * const guard = new AgentGuard({ apiKey: process.env.AGENTGUARD_API_KEY! });
 * const result = await guard.evaluate({ type: 'refund_customer', tool: 'payment_api', parameters: { customerId: 'CUS123', amount: 45000 } });
 * if (result.decision === 'REQUIRES_APPROVAL') console.log('Waiting on a human:', result.approvalId);
 */
export class AgentGuard {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AgentGuardOptions) {
    if (!opts.apiKey) throw new Error('AgentGuard: apiKey is required');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? 'https://api.agentguard.dev').replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    const f = opts.fetch ?? globalThis.fetch;
    if (!f) throw new Error('AgentGuard: no global fetch found; pass { fetch } explicitly (e.g. node-fetch) on older runtimes');
    this.fetchImpl = f;
  }

  /** Submits an action and returns the gateway's decision. Never throws for BLOCK; check `result.decision`. */
  async evaluate(action: ActionRequest): Promise<ActionResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/agent-actions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ actionType: action.type, tool: action.tool, parameters: action.parameters ?? {}, userContext: action.userContext }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 429 || res.status >= 500) {
        throw new AgentGuardError(body?.error?.message ?? `Request failed with ${res.status}`, res.status, body?.error?.code ?? 'REQUEST_FAILED', body?.error?.details);
      }
      return body as ActionResult; // 200 ALLOW, 202 REQUIRES_APPROVAL, 403 BLOCK are all valid decision bodies
    } finally {
      clearTimeout(timer);
    }
  }

  /** Like `evaluate`, but throws `AgentGuardBlockedError` on BLOCK so call sites can just `await guard.action(...)`. */
  async action(action: ActionRequest): Promise<ActionResult> {
    const result = await this.evaluate(action);
    if (result.decision === 'BLOCK') throw new AgentGuardBlockedError(result);
    return result;
  }
}

export default AgentGuard;
