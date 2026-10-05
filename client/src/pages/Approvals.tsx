import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, RiskBadge, Select, StatusBadge, Textarea } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Approval, Paginated } from '../types';
import { formatDate, timeAgo, titleCase } from '../utils/format';
import { can } from '../utils/rbac';

function ApprovalCard({ approval }: { approval: Approval }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => api.post(`/api/approvals/${approval._id}/${decision}`, { note: note || undefined }),
    onMutate: (decision) => setBusy(decision),
    onSettled: () => { setBusy(null); qc.invalidateQueries({ queryKey: ['approvals'] }); },
  });
  const agentName = approval.agentId?.name ?? 'Unknown agent';
  const criticalNeedsAdmin = approval.riskLevel === 'CRITICAL' && !['OWNER', 'ADMIN'].includes(role ?? '');

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{titleCase(approval.actionId.actionType)}</p>
          <p className="text-xs text-muted">{agentName} · {approval.agentId?.environment} · {timeAgo(approval.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2"><RiskBadge level={approval.riskLevel} /><span className="font-mono text-xs text-muted">{approval.riskScore}/100</span></div>
      </div>
      <p className="mb-3 text-sm text-ink">{approval.reason}</p>
      {Object.keys(approval.actionId.parameters ?? {}).length > 0 && (
        <pre className="mb-3 overflow-x-auto rounded bg-canvas p-2.5 font-mono text-xs text-muted">{JSON.stringify(approval.actionId.parameters, null, 2)}</pre>
      )}
      {approval.status === 'PENDING' && can(role, 'approvals:decide') && (
        <div className="space-y-2 border-t border-border pt-3">
          {criticalNeedsAdmin && <p className="text-xs text-risk-CRITICAL">CRITICAL-risk approvals require an Admin or Owner.</p>}
          <Textarea rows={2} placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={!!busy || criticalNeedsAdmin} onClick={() => decide.mutate('approve')}><Check size={14} /> {busy === 'approve' ? 'Approving…' : 'Approve'}</Button>
            <Button variant="danger" size="sm" disabled={!!busy} onClick={() => decide.mutate('reject')}><X size={14} /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}</Button>
          </div>
        </div>
      )}
      {approval.status !== 'PENDING' && (
        <div className="border-t border-border pt-3 text-xs text-muted">
          <StatusBadge status={approval.status} /> {approval.decisionNote && <span className="ml-2">"{approval.decisionNote}"</span>}
        </div>
      )}
    </Card>
  );
}

export default function Approvals() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, error } = useQuery({
    queryKey: ['approvals', status], queryFn: () => api.get<Paginated<Approval>>('/api/approvals', { status: status || undefined, limit: 50 }),
    refetchInterval: 20_000,
  });

  return (
    <div>
      <PageHeader title="Approvals" description="Actions the policy engine escalated for a human decision."
        actions={<Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="PENDING">Pending</option><option value="">All</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="EXPIRED">Expired</option></Select>} />
      {isLoading && <LoadingState />}
      {error && <ErrorState message="Could not load approvals." />}
      {data && data.items.length === 0 && <EmptyState title="Nothing to review" body="Approval requests from the gateway will show up here in real time." />}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data?.items.map((a) => <ApprovalCard key={a._id} approval={a} />)}
      </div>
    </div>
  );
}
