import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, RiskBadge, Select, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import type { Paginated, SecurityEvent } from '../types';
import { timeAgo, titleCase } from '../utils/format';

export default function Security() {
  const [filters, setFilters] = useState({ severity: '', status: '', type: '' });
  const { data, isLoading, error } = useQuery({
    queryKey: ['security-events', filters], queryFn: () => api.get<Paginated<SecurityEvent> & { openBySeverity: Record<string, number> }>('/api/security-events', { limit: 50, ...filters }),
    refetchInterval: 20_000,
  });

  return (
    <div>
      <PageHeader title="Security" description="Automatically raised when the gateway blocks, detects injection, or finds a data leak." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
          <Card key={lvl} className="p-4"><p className="text-xs text-muted">Open · {lvl}</p><p className={`mt-1.5 font-mono text-2xl font-semibold risk-${lvl}`}>{data?.openBySeverity?.[lvl] ?? 0}</p></Card>
        ))}
      </div>
      <Card className="mb-4 flex flex-wrap gap-2 p-3">
        <Select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}><option value="">All severities</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="FALSE_POSITIVE">False positive</option></Select>
        <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          {['PROMPT_INJECTION', 'DATA_LEAK', 'POLICY_VIOLATION', 'UNAUTHORIZED_ACTION', 'ANOMALOUS_BEHAVIOR', 'EXCESSIVE_PERMISSION', 'SUSPICIOUS_TOOL_USAGE'].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
        </Select>
      </Card>
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load security events." />}
      {data && data.items.length === 0 && <EmptyState title="No security events" body="Nothing suspicious has been detected yet." />}
      {data && data.items.length > 0 && (
        <Table>
          <thead><tr><Th>Time</Th><Th>Severity</Th><Th>Type</Th><Th>Title</Th><Th>Agent</Th><Th>Status</Th></tr></thead>
          <tbody>
            {data.items.map((e) => (
              <Tr key={e._id}>
                <Td className="text-muted">{timeAgo(e.createdAt)}</Td>
                <Td><RiskBadge level={e.severity} /></Td>
                <Td className="text-muted">{titleCase(e.type)}</Td>
                <Td><Link to={`/security/${e._id}`} className="font-medium hover:text-accent">{e.title}</Link></Td>
                <Td className="text-muted">{e.agentId?.name ?? '—'}</Td>
                <Td className="text-muted">{titleCase(e.status)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
