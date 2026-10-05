import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Input, Label, LoadingState, Modal, PageHeader, RiskBadge, StatusDot, Table, Td, Textarea, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Agent, Paginated } from '../types';
import { timeAgo } from '../utils/format';
import { can } from '../utils/rbac';

function CreateAgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', environment: 'DEVELOPMENT', permissions: '', allowedTools: '' });
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => api.post<{ apiKey: string }>('/api/agents', {
      ...form,
      permissions: form.permissions.split(',').map((s) => s.trim()).filter(Boolean),
      allowedTools: form.allowedTools.split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: (res) => { setIssuedKey(res.apiKey); qc.invalidateQueries({ queryKey: ['agents'] }); },
  });

  const close = () => { setIssuedKey(null); setForm({ name: '', description: '', environment: 'DEVELOPMENT', permissions: '', allowedTools: '' }); onClose(); };

  return (
    <Modal open={open} onClose={close} title={issuedKey ? 'Agent created' : 'New agent'}>
      {issuedKey ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Copy this API key now — it will not be shown again.</p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-canvas p-2.5">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">{issuedKey}</code>
            <button onClick={() => navigator.clipboard.writeText(issuedKey)} className="text-muted hover:text-ink"><Copy size={14} /></button>
          </div>
          <Button variant="primary" className="w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Environment</Label>
            <select className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
              <option value="DEVELOPMENT">Development</option><option value="STAGING">Staging</option><option value="PRODUCTION">Production</option>
            </select>
          </div>
          <div><Label>Permissions (comma-separated action types, or *)</Label><Input placeholder="refund_customer, get_customer" value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} /></div>
          <div><Label>Allowed tools (comma-separated, or *)</Label><Input placeholder="payment_api, crm_api" value={form.allowedTools} onChange={(e) => setForm({ ...form, allowedTools: e.target.value })} /></div>
          {create.isError && <p className="text-sm text-risk-CRITICAL">{(create.error as any).message}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create agent'}</Button>
        </form>
      )}
    </Modal>
  );
}

export default function Agents() {
  const role = useAuthStore((s) => s.role);
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['agents'], queryFn: () => api.get<Paginated<Agent>>('/api/agents', { limit: 50 }) });

  return (
    <div>
      <PageHeader title="Agents" description="Every AI agent registered to call your systems through AgentGuard."
        actions={can(role, 'agents:write') && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New agent</Button>} />
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load agents." />}
      {data && data.items.length === 0 && <EmptyState title="No agents yet" body="Create your first agent to get an API key and start sending actions through the gateway." />}
      {data && data.items.length > 0 && (
        <Table>
          <thead><tr><Th>Name</Th><Th>Status</Th><Th>Environment</Th><Th>Risk</Th><Th>Tools</Th><Th>Last seen</Th></tr></thead>
          <tbody>
            {data.items.map((a) => (
              <Tr key={a.id}>
                <Td><Link to={`/agents/${a.id}`} className="font-medium text-ink hover:text-accent">{a.name}</Link></Td>
                <Td><span className="flex items-center gap-1.5"><StatusDot active={a.status === 'ACTIVE'} /> {a.status}</span></Td>
                <Td className="text-muted">{a.environment}</Td>
                <Td><RiskBadge level={a.riskLevel} /></Td>
                <Td className="text-muted">{a.allowedTools.join(', ') || '—'}</Td>
                <Td className="text-muted">{a.lastSeenAt ? timeAgo(a.lastSeenAt) : 'Never'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <CreateAgentModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
