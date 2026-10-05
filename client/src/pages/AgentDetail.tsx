import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Play, Power } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, DecisionBadge, EmptyState, ErrorState, Label, LoadingState, Modal, PageHeader, RiskBadge, StatusBadge, StatusDot, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { ActionRecord, Agent, ApiKeyRecord, Paginated } from '../types';
import { timeAgo, titleCase } from '../utils/format';
import { can } from '../utils/rbac';

export default function AgentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['agent', id], queryFn: () => api.get<{ agent: Agent; apiKeys: ApiKeyRecord[] }>(`/api/agents/${id}`) });
  const { data: actions } = useQuery({ queryKey: ['actions', { agentId: id }], queryFn: () => api.get<Paginated<ActionRecord>>('/api/actions', { agentId: id, limit: 20 }) });
  const { data: stats } = useQuery({ queryKey: ['agent-stats', id], queryFn: () => api.get<{ series: any[] }>(`/api/analytics/agents/${id}`, { days: 14 }) });

  const setStatus = useMutation({
    mutationFn: (status: string) => api.post(`/api/agents/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agent', id] }); qc.invalidateQueries({ queryKey: ['agents'] }); },
  });
  const rotate = useMutation({
    mutationFn: () => api.post<{ apiKey: string }>(`/api/agents/${id}/rotate-key`),
    onSuccess: (res) => { setRotatedKey(res.apiKey); qc.invalidateQueries({ queryKey: ['agent', id] }); },
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Agent not found." />;
  const { agent, apiKeys } = data;
  const canWrite = can(role, 'agents:write');

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={agent.description || 'No description provided.'}
        actions={canWrite && (
          <>
            <Button size="sm" onClick={() => navigate(`/demo?agentId=${agent.id}`)}><Play size={14} /> Run in Demo</Button>
            <Button size="sm" onClick={() => rotate.mutate()} disabled={rotate.isPending}><KeyRound size={14} /> Rotate key</Button>
            <Button size="sm" variant={agent.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => setStatus.mutate(agent.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')} disabled={setStatus.isPending}>
              <Power size={14} /> {agent.status === 'ACTIVE' ? 'Disable' : 'Activate'}
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Status</p><p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium"><StatusDot active={agent.status === 'ACTIVE'} /> {agent.status}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Risk level</p><p className="mt-1.5"><RiskBadge level={agent.riskLevel} /></p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Environment</p><p className="mt-1.5 text-sm font-medium">{agent.environment}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Last seen</p><p className="mt-1.5 text-sm font-medium">{agent.lastSeenAt ? timeAgo(agent.lastSeenAt) : 'Never'}</p></Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-ink">Activity & average risk (14 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.series ?? []}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8a92a1' }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8a92a1' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="rgb(var(--ag-accent))" fill="rgb(var(--ag-accent))" fillOpacity={0.15} name="Actions" />
              <Area type="monotone" dataKey="avgRisk" stroke="#e2683a" fill="#e2683a" fillOpacity={0.1} name="Avg risk" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-ink">Permissions</h3>
          <div className="mb-3 flex flex-wrap gap-1">{agent.permissions.length ? agent.permissions.map((p) => <span key={p} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-muted">{p}</span>) : <span className="text-sm text-muted">None</span>}</div>
          <h3 className="mb-2 text-sm font-medium text-ink">Allowed tools</h3>
          <div className="mb-3 flex flex-wrap gap-1">{agent.allowedTools.length ? agent.allowedTools.map((t) => <span key={t} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-muted">{t}</span>) : <span className="text-sm text-muted">None</span>}</div>
          <h3 className="mb-2 text-sm font-medium text-ink">Active API keys</h3>
          <ul className="space-y-1 text-xs text-muted">{apiKeys.map((k) => <li key={k.id} className="font-mono">{k.prefix}… · {k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : 'never used'}</li>)}</ul>
        </Card>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-medium text-ink">Recent actions</h3>
      {!actions?.items.length && <EmptyState title="No actions yet" body="Actions this agent submits to the gateway will appear here." />}
      {!!actions?.items.length && (
        <Table>
          <thead><tr><Th>Time</Th><Th>Action</Th><Th>Tool</Th><Th>Decision</Th><Th>Risk</Th><Th>Status</Th></tr></thead>
          <tbody>
            {actions.items.map((a) => (
              <Tr key={a._id}>
                <Td className="text-muted">{timeAgo(a.timestamp)}</Td>
                <Td className="font-mono text-xs">{a.actionType}</Td>
                <Td className="text-muted">{a.tool}</Td>
                <Td><DecisionBadge decision={a.policyDecision} /></Td>
                <Td><RiskBadge level={a.riskLevel} /> <span className="ml-1 font-mono text-xs text-muted">{a.riskScore}</span></Td>
                <Td><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={!!rotatedKey} onClose={() => setRotatedKey(null)} title="Key rotated">
        <p className="mb-3 text-sm text-muted">Previous keys are revoked. Copy this new key now — it will not be shown again.</p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-canvas p-2.5">
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs">{rotatedKey}</code>
          <button onClick={() => rotatedKey && navigator.clipboard.writeText(rotatedKey)} className="text-muted hover:text-ink"><Copy size={14} /></button>
        </div>
        <Button variant="primary" className="mt-3 w-full" onClick={() => setRotatedKey(null)}>Done</Button>
      </Modal>
    </div>
  );
}
