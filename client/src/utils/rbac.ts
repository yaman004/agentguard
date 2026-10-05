import type { Role } from '../types';

export type Permission =
  | 'agents:read' | 'agents:write' | 'policies:read' | 'policies:write' | 'tools:read' | 'tools:write'
  | 'actions:read' | 'approvals:read' | 'approvals:decide' | 'audit:read' | 'analytics:read'
  | 'security:read' | 'security:write' | 'evaluations:read' | 'evaluations:write' | 'org:settings' | 'org:manage_members';

const ALL: Permission[] = ['agents:read', 'agents:write', 'policies:read', 'policies:write', 'tools:read', 'tools:write', 'actions:read', 'approvals:read', 'approvals:decide', 'audit:read', 'analytics:read', 'security:read', 'security:write', 'evaluations:read', 'evaluations:write', 'org:settings', 'org:manage_members'];

const MATRIX: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== 'org:manage_members'),
  SECURITY_ANALYST: ['agents:read', 'policies:read', 'tools:read', 'actions:read', 'approvals:read', 'approvals:decide', 'audit:read', 'analytics:read', 'security:read', 'security:write', 'evaluations:read'],
  DEVELOPER: ['agents:read', 'agents:write', 'policies:read', 'tools:read', 'actions:read', 'audit:read', 'analytics:read', 'evaluations:read', 'evaluations:write'],
  VIEWER: ['agents:read', 'policies:read', 'tools:read', 'actions:read', 'approvals:read', 'analytics:read', 'security:read', 'evaluations:read'],
};

export const can = (role: Role | null, perm: Permission) => !!role && MATRIX[role].includes(perm);
