import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorState, LoadingState, PageHeader, StatCard } from '../components/ui';
import { api } from '../services/api';
import type { AnalyticsOverview } from '../types';
import { timeAgo, titleCase } from '../utils/format';

const RISK_COLORS: Record<string, string> = { LOW: '#3fae7a', MEDIUM: '#d9a441', HIGH: '#e2683a', CRITICAL: '#d64545' };
const AXIS = { fontSize: 11, fill: '#8a92a1' };
const gridStroke = 'rgb(var(--ag-border))';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['analytics', 7], queryFn: () => api.get<AnalyticsOverview>('/api/analytics', { days: 7 }) });

  if (isLoading) return <LoadingState label="Loading analytics…" />;
  if (error || !data) return <ErrorState message="Could not load analytics." />;
  const { summary, charts, recentAgents } = data;

  return (
    <div>
      <PageHeader title="Dashboard" description="Live data from your MongoDB deployment — last 7 days." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total agents" value={summary.totalAgents} hint={`${summary.activeAgents} active`} />
        <StatCard label="High-risk agents" value={summary.highRiskAgents} />
        <StatCard label="Actions (24h)" value={summary.actions24h} />
        <StatCard label="Blocked (7d)" value={summary.blockedActions} />
        <StatCard label="Approval requests (7d)" value={summary.approvalRequests} hint={`${summary.pendingApprovals} pending now`} />
        <StatCard label="Policy violations (7d)" value={summary.policyViolations} />
        <StatCard label="Security events (7d)" value={summary.securityEvents} />
        <StatCard label="High-risk actions (7d)" value={summary.highRiskActions} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-ink">Agent activity over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts.activity}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="allowed" stackId="1" stroke="#3fae7a" fill="#3fae7a" fillOpacity={0.25} name="Allowed" />
              <Area type="monotone" dataKey="approval" stackId="1" stroke="#d9a441" fill="#d9a441" fillOpacity={0.25} name="Approval" />
              <Area type="monotone" dataKey="blocked" stackId="1" stroke="#d64545" fill="#d64545" fillOpacity={0.25} name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Risk distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.riskDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.riskDistribution.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted">
            {charts.riskDistribution.map((r) => <span key={r.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[r.name] }} />{r.name} ({r.value})</span>)}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Actions by tool</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.byTool} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={90} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" fill="rgb(var(--ag-accent))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Actions by agent</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.byAgent} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={90} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" fill="#6b7280" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Security events by severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.securityBySeverity}>
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {charts.securityBySeverity.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Approval trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.approvalTrend}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ background: 'rgb(var(--ag-surface))', border: '1px solid rgb(var(--ag-border))', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="approved" stackId="a" fill="#3fae7a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" stackId="a" fill="#d64545" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-ink">Recently active agents</h3>
          <ul className="divide-y divide-border">
            {recentAgents.length === 0 && <p className="py-6 text-center text-sm text-muted">No agent activity yet.</p>}
            {recentAgents.map((a) => (
              <li key={a.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink">{a.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className={`risk-${a.riskLevel}`}>{a.riskLevel}</span> · {timeAgo(a.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
