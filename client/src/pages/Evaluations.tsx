import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Play } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Card, DecisionBadge, EmptyState, ErrorState, Input, Label, LoadingState, Modal, PageHeader, Select, StatCard, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Agent, EvaluationCase, EvaluationRun, Paginated } from '../types';
import { timeAgo, titleCase } from '../utils/format';
import { can } from '../utils/rbac';

function NewCaseModal({ open, onClose, agents }: { open: boolean; onClose: () => void; agents: Agent[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', actionType: '', tool: '', expectedDecision: 'ALLOW', agentId: '' });
  const create = useMutation({
    mutationFn: () => api.post('/api/evaluations/cases', { ...form, agentId: form.agentId || undefined, parameters: {} }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-cases'] }); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} title="New test case">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div><Label>Name</Label><Input required placeholder="High-value refund needs approval" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Action type</Label><Input required placeholder="refund_customer" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} /></div>
        <div><Label>Tool</Label><Input required placeholder="payment_api" value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })} /></div>
        <div><Label>Expected decision</Label><Select className="w-full" value={form.expectedDecision} onChange={(e) => setForm({ ...form, expectedDecision: e.target.value })}><option value="ALLOW">Allow</option><option value="BLOCK">Block</option><option value="REQUIRES_APPROVAL">Requires approval</option></Select></div>
        <div><Label>Pin to agent (optional; otherwise the run's agent is used)</Label><Select className="w-full" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}><option value="">Run's agent</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
        <Button type="submit" variant="primary" className="w-full" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create test case'}</Button>
      </form>
    </Modal>
  );
}

export default function Evaluations() {
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [runAgent, setRunAgent] = useState('');
  const { data: cases } = useQuery({ queryKey: ['eval-cases'], queryFn: () => api.get<{ items: EvaluationCase[] }>('/api/evaluations/cases') });
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: () => api.get<Paginated<Agent>>('/api/agents', { limit: 50 }) });
  const { data: runs, isLoading, error } = useQuery({ queryKey: ['eval-runs'], queryFn: () => api.get<Paginated<EvaluationRun>>('/api/evaluations/runs', { limit: 20 }), refetchInterval: 5000 });
  const startRun = useMutation({ mutationFn: () => api.post('/api/evaluations/runs', { agentId: runAgent }), onSuccess: () => qc.invalidateQueries({ queryKey: ['eval-runs'] }) });

  const latest = runs?.items[0];
  const canWrite = can(role, 'evaluations:write');

  return (
    <div>
      <PageHeader title="Agent Evaluation" description="Replay test cases through the live decision pipeline (no side effects) to catch policy drift before it reaches production."
        actions={canWrite && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New test case</Button>} />

      {latest?.summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Policy compliance" value={`${latest.summary.complianceRate}%`} hint={`${latest.summary.passed}/${latest.summary.total} passed`} />
          <StatCard label="Tests failed" value={latest.summary.failed} />
          <StatCard label="Unsafe allows" value={latest.summary.unsafe} hint="Expected block/approval, got allow" />
          <StatCard label="Avg latency" value={`${latest.summary.avgLatencyMs} ms`} />
        </div>
      )}

      {canWrite && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
          <Select value={runAgent} onChange={(e) => setRunAgent(e.target.value)}><option value="">Select agent to run against…</option>{agents?.items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Button variant="primary" disabled={!runAgent || startRun.isPending} onClick={() => startRun.mutate()}><Play size={14} /> Run test suite</Button>
          <span className="text-xs text-muted">{cases?.items.length ?? 0} test cases</span>
        </Card>
      )}

      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load evaluation runs." />}
      {latest?.results && (
        <>
          <h3 className="mb-2 text-sm font-medium text-ink">Latest run · {latest.agentId?.name} · {titleCase(latest.status)}</h3>
          <Table>
            <thead><tr><Th>Test</Th><Th>Expected</Th><Th>Actual</Th><Th>Result</Th><Th>Risk</Th><Th>Latency</Th></tr></thead>
            <tbody>
              {latest.results.map((r) => (
                <Tr key={r.caseId}>
                  <Td>{r.name}</Td>
                  <Td><DecisionBadge decision={r.expected} /></Td>
                  <Td><DecisionBadge decision={r.actual} /></Td>
                  <Td className={r.passed ? 'text-[#3fae7a]' : r.unsafe ? 'text-risk-CRITICAL font-medium' : 'text-risk-HIGH'}>{r.passed ? 'Passed' : r.unsafe ? 'Unsafe' : 'Failed'}</Td>
                  <Td className="font-mono text-xs text-muted">{r.riskScore}</Td>
                  <Td className="font-mono text-xs text-muted">{r.latencyMs}ms</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      {!latest && !isLoading && <EmptyState title="No evaluation runs yet" body="Add test cases, then run the suite against an agent." />}

      <h3 className="mb-2 mt-6 text-sm font-medium text-ink">Test cases</h3>
      {!cases?.items.length && <EmptyState title="No test cases yet" />}
      {!!cases?.items.length && (
        <Table>
          <thead><tr><Th>Name</Th><Th>Action</Th><Th>Tool</Th><Th>Expected</Th><Th>Agent</Th></tr></thead>
          <tbody>{cases.items.map((c) => (
            <Tr key={c._id}><Td>{c.name}</Td><Td className="font-mono text-xs">{c.actionType}</Td><Td className="text-muted">{c.tool}</Td><Td><DecisionBadge decision={c.expectedDecision} /></Td><Td className="text-muted">{c.agentId?.name ?? 'Run\'s agent'}</Td></Tr>
          ))}</tbody>
        </Table>
      )}
      <NewCaseModal open={open} onClose={() => setOpen(false)} agents={agents?.items ?? []} />
    </div>
  );
}
