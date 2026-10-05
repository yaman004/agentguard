import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Button, EmptyState, ErrorState, Input, Label, LoadingState, Modal, PageHeader, Select, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Paginated, Policy } from '../types';
import { titleCase } from '../utils/format';
import { can } from '../utils/rbac';

function PolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', actionType: '', tool: '', effect: 'REQUIRE_APPROVAL', maxAmount: '', allowedAgentIds: '' });
  const create = useMutation({
    mutationFn: () => api.post('/api/policies', {
      name: form.name, actionType: form.actionType, tool: form.tool || undefined, effect: form.effect,
      conditions: { maxAmount: form.maxAmount ? Number(form.maxAmount) : undefined, allowedAgentIds: form.allowedAgentIds ? form.allowedAgentIds.split(',').map((s) => s.trim()) : undefined },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} title="New policy">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div><Label>Name</Label><Input required placeholder="Refund Limit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Action type (snake_case, or *)</Label><Input required placeholder="refund_customer" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} /></div>
        <div><Label>Tool (optional — restrict to one tool)</Label><Input placeholder="payment_api" value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })} /></div>
        <div>
          <Label>Effect</Label>
          <Select className="w-full" value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })}>
            <option value="REQUIRE_APPROVAL">Require human approval</option>
            <option value="BLOCK">Always block</option>
          </Select>
        </div>
        <div><Label>Max amount (optional)</Label><Input type="number" placeholder="5000" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} /></div>
        <div><Label>Allow-list agent IDs (optional, comma-separated)</Label><Input placeholder="Only these agents may proceed" value={form.allowedAgentIds} onChange={(e) => setForm({ ...form, allowedAgentIds: e.target.value })} /></div>
        {create.isError && <p className="text-sm text-risk-CRITICAL">{(create.error as any).message}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create policy'}</Button>
      </form>
    </Modal>
  );
}

export default function Policies() {
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['policies'], queryFn: () => api.get<Paginated<Policy>>('/api/policies') });
  const toggle = useMutation({ mutationFn: (p: Policy) => api.patch(`/api/policies/${p.id}`, { enabled: !p.enabled }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/api/policies/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) });
  const canWrite = can(role, 'policies:write');

  return (
    <div>
      <PageHeader title="Policies" description="Deterministic rules the gateway enforces before any tool runs."
        actions={canWrite && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New policy</Button>} />
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load policies." />}
      {data && data.items.length === 0 && <EmptyState title="No policies yet" body="Without policies, every permitted action is allowed automatically." />}
      {data && data.items.length > 0 && (
        <Table>
          <thead><tr><Th>Name</Th><Th>Action type</Th><Th>Tool</Th><Th>Effect</Th><Th>Condition</Th><Th>Enabled</Th>{canWrite && <Th></Th>}</tr></thead>
          <tbody>
            {data.items.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="font-mono text-xs">{p.actionType}</Td>
                <Td className="text-muted">{p.tool ?? 'any'}</Td>
                <Td>{titleCase(p.effect)}</Td>
                <Td className="text-muted">{p.conditions.maxAmount != null ? `amount > ${p.conditions.maxAmount}` : p.conditions.allowedAgentIds?.length ? `allow-list (${p.conditions.allowedAgentIds.length})` : '—'}</Td>
                <Td>
                  <button onClick={() => canWrite && toggle.mutate(p)} disabled={!canWrite} className={`rounded px-2 py-0.5 text-xs ${p.enabled ? 'bg-risk-LOW text-[#3fae7a]' : 'border border-border text-muted'}`}>{p.enabled ? 'Enabled' : 'Disabled'}</button>
                </Td>
                {canWrite && <Td><button onClick={() => confirm(`Delete policy "${p.name}"?`) && del.mutate(p.id)} className="text-muted hover:text-risk-CRITICAL"><Trash2 size={14} /></button></Td>}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <PolicyModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
