import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Activity, Bell, BookOpen, Bot, FileClock, FlaskConical, LayoutDashboard, LogOut,
  Moon, PlayCircle, ScrollText, Settings, ShieldAlert, ShieldCheck, Sun, Wrench,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Notification } from '../types';
import { timeAgo, titleCase } from '../utils/format';
import { can } from '../utils/rbac';
import { useToast } from './../components/Toaster';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'analytics:read' as const },
  { to: '/agents', label: 'Agents', icon: Bot, perm: 'agents:read' as const },
  { to: '/policies', label: 'Policies', icon: ShieldCheck, perm: 'policies:read' as const },
  { to: '/tools', label: 'Tools', icon: Wrench, perm: 'tools:read' as const },
  { to: '/actions', label: 'Actions', icon: Activity, perm: 'actions:read' as const },
  { to: '/approvals', label: 'Approvals', icon: FileClock, perm: 'approvals:read' as const },
  { to: '/security', label: 'Security', icon: ShieldAlert, perm: 'security:read' as const },
  { to: '/audit-logs', label: 'Audit logs', icon: ScrollText, perm: 'audit:read' as const },
  { to: '/evaluations', label: 'Evaluations', icon: FlaskConical, perm: 'evaluations:read' as const },
  { to: '/demo', label: 'Demo', icon: PlayCircle, perm: 'evaluations:write' as const },
];

export default function AppLayout() {
  const { user, organization, role, clear } = useAuthStore((s) => ({ user: s.user, organization: s.organization, role: s.role, clear: s.clear }));
  const logout = useLogout();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [notifOpen, setNotifOpen] = useState(false);

  useSocket(
    {
      approval_created: (p) => toast({ title: `Approval needed: ${titleCase(p.actionType)}`, body: `${p.agentName} · risk ${p.riskScore}`, link: '/approvals', tone: 'alert' }),
      security_alert: (p) => toast({ title: `${p.severity}: ${titleCase(p.title ?? p.type)}`, link: `/security/${p.id}`, tone: 'alert' }),
      approval_completed: (p) => toast({ title: `Approval ${p.status.toLowerCase()}`, link: '/approvals', tone: p.status === 'APPROVED' ? 'success' : 'info' }),
      agent_status_changed: (p) => toast({ title: `${p.name}: ${p.from} → ${p.to}`, link: '/agents', tone: 'info' }),
    },
    (n: Notification) => toast({ title: n.title, body: n.body, link: n.link, tone: 'alert' })
  );

  const { data: notifData } = useQuery({
    queryKey: ['notifications'], queryFn: () => api.get<{ items: Notification[]; unread: number }>('/api/notifications'),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex h-screen bg-canvas">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent"><ShieldCheck size={16} /></div>
          <span className="text-sm font-semibold tracking-tight text-ink">AgentGuard</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.filter((n) => can(role, n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors', isActive ? 'bg-accent/15 text-accent font-medium' : 'text-muted hover:bg-canvas hover:text-ink')}>
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-border p-2">
          <a href="/api/docs" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted hover:bg-canvas hover:text-ink"><BookOpen size={16} /> API docs</a>
          {can(role, 'org:settings') && (
            <NavLink to="/settings" className={({ isActive }) => clsx('flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm', isActive ? 'bg-accent/15 text-accent font-medium' : 'text-muted hover:bg-canvas hover:text-ink')}>
              <Settings size={16} /> Settings
            </NavLink>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
          <div className="text-sm text-muted">{organization?.name}</div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Notifications">
                <Bell size={16} />
                {!!notifData?.unread && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-black">{notifData.unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-md border border-border bg-surface p-1 shadow-card" onMouseLeave={() => setNotifOpen(false)}>
                  {!notifData?.items.length && <p className="p-3 text-sm text-muted">No notifications yet.</p>}
                  {notifData?.items.slice(0, 8).map((n) => (
                    <Link key={n.id} to={n.link ?? '#'} onClick={() => setNotifOpen(false)} className="block rounded px-2.5 py-2 hover:bg-canvas">
                      <p className="text-sm text-ink">{n.title}</p>
                      <p className="text-xs text-muted">{n.body} · {timeAgo(n.createdAt)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <div className="text-right leading-tight">
                <p className="text-xs font-medium text-ink">{user?.name}</p>
                <p className="text-[11px] text-muted">{titleCase(role ?? '')}</p>
              </div>
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
                className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
