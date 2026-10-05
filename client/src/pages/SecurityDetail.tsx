import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, ErrorState, LoadingState, PageHeader, RiskBadge, Select, Textarea } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { SecurityEvent } from '../types';
import { formatDate, titleCase } from '../utils/format';
import { can } from '../utils/rbac';

export default function SecurityDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['security-event', id], queryFn: () => api.get<{ event: SecurityEvent }>(`/api/security-events/${id}`) });

  const update = useMutation({ mutationFn: (body: object) => api.patch(`/api/security-events/${id}`, body), onSuccess: () => qc.invalidateQueries({ queryKey: ['security-event', id] }) });
  const addNote = useMutation({ mutationFn: () => api.post(`/api/security-events/${id}/notes`, { text: note }), onSuccess: () => { setNote(''); qc.invalidateQueries({ queryKey: ['security-event', id] }); } });
  const explain = useMutation({ mutationFn: () => api.post(`/api/security-events/${id}/explain`), onSuccess: () => qc.invalidateQueries({ queryKey: ['security-event', id] }) });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Security event not found." />;
  const e = data.event;
  const canWrite = can(role, 'security:write');

  return (
    <div>
      <PageHeader title={e.title} description={titleCase(e.type)}
        actions={canWrite && <Select value={e.status} onChange={(ev) => update.mutate({ status: ev.target.value })}><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="FALSE_POSITIVE">False positive</option></Select>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2"><RiskBadge level={e.severity} /><span className="text-xs text-muted">{formatDate(e.createdAt)}</span></div>
            <p className="text-sm text-ink">{e.description}</p>
            {Object.keys(e.metadata ?? {}).length > 0 && <pre className="mt-3 overflow-x-auto rounded bg-canvas p-2.5 font-mono text-xs text-muted">{JSON.stringify(e.metadata, null, 2)}</pre>}
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">AI explanation</h3>
              {!e.aiExplanation && <Button size="sm" onClick={() => explain.mutate()} disabled={explain.isPending}><Sparkles size={14} /> {explain.isPending ? 'Asking…' : 'Explain with AI'}</Button>}
            </div>
            {e.aiExplanation ? <p className="text-sm text-ink">{e.aiExplanation.text}</p> : explain.isError ? <p className="text-sm text-muted">{(explain.error as any).message}</p> : <p className="text-sm text-muted">No explanation generated yet.</p>}
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-medium text-ink">Investigation notes</h3>
            <ul className="mb-3 space-y-2">
              {e.notes.map((n, i) => <li key={i} className="rounded bg-canvas p-2.5 text-sm"><p className="text-ink">{n.text}</p><p className="mt-1 text-xs text-muted">{n.authorId?.name} · {formatDate(n.createdAt)}</p></li>)}
              {e.notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
            </ul>
            {canWrite && (
              <div className="flex gap-2">
                <Textarea rows={1} placeholder="Add a note…" value={note} onChange={(ev) => setNote(ev.target.value)} />
                <Button onClick={() => note && addNote.mutate()} disabled={addNote.isPending}>Add</Button>
              </div>
            )}
          </Card>
        </div>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-ink">Related agent</h3>
          {e.agentId ? <button onClick={() => navigate(`/agents/${e.agentId!._id}`)} className="text-sm text-accent hover:underline">{e.agentId.name}</button> : <p className="text-sm text-muted">—</p>}
          {e.actionId && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-medium text-ink">Related action</h3>
              <p className="font-mono text-xs text-muted">{e.actionId.actionType} on {e.actionId.tool}</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
