export type Role = 'OWNER' | 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER' | 'VIEWER';
export type AgentStatus = 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Decision = 'ALLOW' | 'BLOCK' | 'REQUIRES_APPROVAL';
export type ActionStatus = 'EXECUTED' | 'BLOCKED' | 'PENDING_APPROVAL' | 'REJECTED' | 'FAILED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type PolicyEffect = 'BLOCK' | 'REQUIRE_APPROVAL';
export type SecurityStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
export type SecurityEventType =
  | 'PROMPT_INJECTION' | 'DATA_LEAK' | 'POLICY_VIOLATION' | 'UNAUTHORIZED_ACTION'
  | 'ANOMALOUS_BEHAVIOR' | 'EXCESSIVE_PERMISSION' | 'SUSPICIOUS_TOOL_USAGE';

export interface User { id: string; name: string; email: string }
export interface Organization { id: string; name: string; slug: string; createdAt?: string }
export interface Member { userId: string; name: string; email: string; role: Role; joinedAt: string }

export interface Agent {
  id: string; name: string; description: string; status: AgentStatus; environment: string;
  riskLevel: RiskLevel; permissions: string[]; allowedTools: string[]; ownerId: string;
  lastSeenAt: string | null; createdAt: string; updatedAt: string;
}
export interface ApiKeyRecord { id: string; prefix: string; createdAt: string; lastUsedAt: string | null }

export interface RiskFactor { factor: string; points: number }
export interface MatchedPolicy { policyId: string; name: string; effect: PolicyEffect; reason: string }
export interface TraceStep { step: string; outcome: string; detail?: unknown; ms: number }

export interface ActionRecord {
  _id: string; id?: string; organizationId: string; agentId: { _id: string; name: string } | string;
  actionType: string; tool: string; parameters: Record<string, unknown>;
  riskScore: number; riskLevel: RiskLevel; riskBreakdown: RiskFactor[];
  policyDecision: Decision; decisionReason: string; matchedPolicies: MatchedPolicy[];
  status: ActionStatus; result: unknown; dlp?: { redacted: boolean; findings: { type: string; count: number }[] };
  aiAnalysis?: { reasoning: string; model: string; generatedAt: string };
  timestamp: string; approvalId?: string;
}

export interface Policy {
  id: string; name: string; description: string; actionType: string; tool: string | null;
  effect: PolicyEffect; conditions: { maxAmount: number | null; allowedAgentIds: string[] | null };
  enabled: boolean; createdAt: string; updatedAt: string;
}

export interface Approval {
  _id: string; organizationId: string; actionId: ActionRecord; agentId: { _id: string; name: string; environment: string };
  requestedBy: string; riskScore: number; riskLevel: RiskLevel; reason: string; status: ApprovalStatus;
  approvedBy?: string; approvedAt?: string; rejectedBy?: string; rejectedAt?: string; decisionNote?: string;
  expiresAt: string; createdAt: string;
}

export interface SecurityEvent {
  _id: string; type: SecurityEventType; severity: RiskLevel; status: SecurityStatus; title: string; description: string;
  agentId?: { _id: string; name: string }; actionId?: ActionRecord; assigneeId?: { _id: string; name: string } | null;
  notes: { authorId: { _id: string; name: string }; text: string; createdAt: string }[];
  aiExplanation?: { text: string; model: string; generatedAt: string }; metadata: Record<string, unknown>;
  createdAt: string; resolvedAt?: string;
}

export interface AuditLog {
  _id: string; organizationId: string; actorType: 'USER' | 'AGENT' | 'SYSTEM'; actorId?: string;
  agentId?: string; action: string; tool?: string; decision?: Decision; riskScore?: number; riskLevel?: RiskLevel;
  ip?: string; userAgent?: string; metadata: Record<string, unknown>; timestamp: string;
}

export interface Tool { name: string; label: string; description: string; sensitivity: 'LOW' | 'MEDIUM' | 'HIGH'; actions: string[]; usage: { total: number; last24h: number; blocked: number } }

export interface EvaluationCase { _id: string; name: string; description: string; actionType: string; tool: string; parameters: Record<string, unknown>; expectedDecision: Decision; agentId?: { _id: string; name: string } }
export interface EvaluationRun {
  _id: string; agentId: { _id: string; name: string }; status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary?: { total: number; passed: number; failed: number; unsafe: number; complianceRate: number; avgLatencyMs: number };
  results?: { caseId: string; name: string; agentName: string; expected: Decision; actual: Decision; passed: boolean; unsafe: boolean; riskScore: number; latencyMs: number; reason: string }[];
  error?: string; createdAt: string; completedAt?: string;
}

export interface AnalyticsOverview {
  days: number;
  summary: {
    totalAgents: number; activeAgents: number; highRiskAgents: number; recentlyActiveAgents: number;
    actions24h: number; blockedActions: number; approvalRequests: number; pendingApprovals: number;
    policyViolations: number; securityEvents: number; highRiskActions: number;
  };
  charts: {
    activity: { date: string; total: number; allowed: number; blocked: number; approval: number }[];
    riskDistribution: { name: string; value: number }[];
    byTool: { name: string; value: number }[];
    byAgent: { name: string; value: number }[];
    decisionSplit: { name: string; value: number }[];
    violationsOverTime: { date: string; violations: number }[];
    securityBySeverity: { name: string; value: number }[];
    approvalTrend: { date: string; created: number; approved: number; rejected: number }[];
  };
  recentAgents: { name: string; status: AgentStatus; riskLevel: RiskLevel; lastSeenAt: string }[];
}

export interface Notification { id: string; type: string; title: string; body: string; link?: string; createdAt: string; read: boolean }
export interface Paginated<T> { items: T[]; total: number; page: number; limit: number }
