import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { api } from '../services/api';
import type { Tool } from '../types';

const SENSITIVITY_STYLE: Record<string, string> = { LOW: 'bg-risk-LOW text-[#3fae7a]', MEDIUM: 'bg-risk-MEDIUM text-[#d9a441]', HIGH: 'bg-risk-HIGH text-[#e2683a]' };

export default function Tools() {
  const { data, isLoading, error } = useQuery({ queryKey: ['tools'], queryFn: () => api.get<{ items: Tool[] }>('/api/tools') });
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Could not load tools." />;

  return (
    <div>
      <PageHeader title="Tools" description="Simulated enterprise systems AgentGuard sits in front of. All calls are intercepted before execution." />
      {data.items.length === 0 && <EmptyState title="No tools registered" />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((t) => (
          <Card key={t.name} className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-medium text-ink">{t.label}</h3>
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SENSITIVITY_STYLE[t.sensitivity]}`}>{t.sensitivity}</span>
            </div>
            <p className="mb-3 text-sm text-muted">{t.description}</p>
            <div className="mb-3 flex flex-wrap gap-1">{t.actions.map((a) => <span key={a} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-muted">{a}</span>)}</div>
            <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted">
              <span>{t.usage.total} calls total</span><span>{t.usage.last24h} in 24h</span><span className="text-risk-CRITICAL">{t.usage.blocked} blocked</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
