import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, DecisionBadge, EmptyState, ErrorState, LoadingState, Modal, PageHeader, RiskBadge, Select, StatusBadge, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import type { ActionRecord, Paginated } from '../types';
import { formatDate } from '../utils/format';

function ActionDetail({ action, onClose }: { action: ActionRecord; onClose: () => void }) {
  const agentName = typeof action.agentId === 'object' ? action.agentId.name : action.agentId;
  return (
    <Modal open onClose={onClose} title={`${action.actionType} · ${agentName}`} wide>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted">Decision</p><DecisionBadge decision={action.policyDecision} /></div>
          <div><p className="text-xs text-muted">Status</p><StatusBadge status={action.status} /></div>
          <div><p className="text-xs text-muted">Risk</p><RiskBadge level={action.riskLevel} /> <span className="font-mono text-xs text-muted">{action.riskScore}/100</span></div>
          <div><p className="text-xs text-muted">Tool</p><p className="font-mono text-xs">{action.tool}</p></div>
        </div>
        <div><p className="mb-1 text-xs text-muted">Reason</p><p className="text-ink">{action.decisionReason}</p></div>
        <div>
          <p className="mb-1 text-xs text-muted">Risk breakdown</p>
          <ul className="space-y-0.5">{action.riskBreakdown.map((f) => <li key={f.factor} className="flex justify-between font-mono text-xs"><span className="text-muted">{f.factor}</span><span>+{f.points}</span></li>)}</ul>
        </div>
        {action.aiAnalysis && <div><p className="mb-1 text-xs text-muted">AI reasoning ({action.aiAnalysis.model})</p><p className="text-ink">{action.aiAnalysis.reasoning}</p></div>}
        <div><p className="mb-1 text-xs text-muted">Parameters</p><pre className="overflow-x-auto rounded bg-canvas p-2.5 font-mono text-xs">{JSON.stringify(action.parameters, null, 2)}</pre></div>
        <div><p className="mb-1 text-xs text-muted">Result</p><pre className="overflow-x-auto rounded bg-canvas p-2.5 font-mono text-xs">{JSON.stringify(action.result, null, 2)}</pre></div>
      </div>
    </Modal>
  );
}

export default function Actions() {
  const [filters, setFilters] = useState({ status: '', decision: '', riskLevel: '' });
  const [selected, setSelected] = useState<ActionRecord | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['actions', filters],
    queryFn: () => api.get<Paginated<ActionRecord>>('/api/actions', { limit: 50, ...filters }),
  });

  return (
    <div>
      <PageHeader title="Actions" description="Every action submitted through the gateway, decided by the deterministic policy and risk engines." />
      <Card className="mb-4 flex flex-wrap gap-2 p-3">
        <Select value={filters.decision} onChange={(e) => setFilters({ ...filters, decision: e.target.value })}>
          <option value="">All decisions</option><option value="ALLOW">Allow</option><option value="BLOCK">Block</option><option value="REQUIRES_APPROVAL">Requires approval</option>
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option><option value="EXECUTED">Executed</option><option value="BLOCKED">Blocked</option><option value="PENDING_APPROVAL">Pending approval</option><option value="REJECTED">Rejected</option><option value="FAILED">Failed</option>
        </Select>
        <Select value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}>
          <option value="">All risk levels</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </Select>
      </Card>
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load actions." />}
      {data && data.items.length === 0 && <EmptyState title="No actions match these filters" />}
      {data && data.items.length > 0 && (
        <Table>
          <thead><tr><Th>Time</Th><Th>Agent</Th><Th>Action</Th><Th>Tool</Th><Th>Decision</Th><Th>Risk</Th><Th>Status</Th></tr></thead>
          <tbody>
            {data.items.map((a) => (
              <Tr key={a._id} className="cursor-pointer" onClick={() => setSelected(a)}>
                <Td className="text-muted">{formatDate(a.timestamp)}</Td>
                <Td>{typeof a.agentId === 'object' ? <Link to={`/agents/${a.agentId._id}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent">{a.agentId.name}</Link> : a.agentId}</Td>
                <Td className="font-mono text-xs">{a.actionType}</Td>
                <Td className="text-muted">{a.tool}</Td>
                <Td><DecisionBadge decision={a.policyDecision} /></Td>
                <Td><RiskBadge level={a.riskLevel} /></Td>
                <Td><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {selected && <ActionDetail action={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
