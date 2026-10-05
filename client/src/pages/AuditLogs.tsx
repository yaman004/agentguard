import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Card, DecisionBadge, EmptyState, ErrorState, Input, LoadingState, PageHeader, RiskBadge, Select, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import type { AuditLog, Paginated } from '../types';
import { formatDate, titleCase } from '../utils/format';

export default function AuditLogs() {
  const [filters, setFilters] = useState({ q: '', riskLevel: '', action: '', from: '', to: '' });
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', filters], queryFn: () => api.get<Paginated<AuditLog>>('/api/audit-logs', { limit: 50, ...filters }),
  });

  return (
    <div>
      <PageHeader title="Audit logs" description="An append-only record of every meaningful action in your organization. Cannot be edited or deleted." />
      <Card className="mb-4 flex flex-wrap gap-2 p-3">
        <Input placeholder="Search action, tool, actor…" className="w-56" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <Select value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}><option value="">All risk levels</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></Select>
        <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </Card>
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load audit logs." />}
      {data && data.items.length === 0 && <EmptyState title="No matching audit entries" />}
      {data && data.items.length > 0 && (
        <Table>
          <thead><tr><Th>Time</Th><Th>Actor</Th><Th>Action</Th><Th>Tool</Th><Th>Decision</Th><Th>Risk</Th><Th>IP</Th></tr></thead>
          <tbody>
            {data.items.map((l) => (
              <Tr key={l._id}>
                <Td className="text-muted">{formatDate(l.timestamp)}</Td>
                <Td className="text-xs">{titleCase(l.actorType)}</Td>
                <Td className="font-mono text-xs">{l.action}</Td>
                <Td className="text-muted">{l.tool ?? '—'}</Td>
                <Td>{l.decision ? <DecisionBadge decision={l.decision} /> : '—'}</Td>
                <Td>{l.riskLevel ? <RiskBadge level={l.riskLevel} /> : '—'}</Td>
                <Td className="font-mono text-xs text-muted">{l.ip ?? '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
