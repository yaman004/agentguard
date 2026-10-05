import clsx from 'clsx';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import React from 'react';
import type { ActionStatus, ApprovalStatus, Decision, RiskLevel } from '../types';
import { titleCase } from '../utils/format';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={clsx('rounded-md border border-border bg-surface', className)} {...props} />
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'default' | 'danger' | 'ghost'; size?: 'sm' | 'md' }> = ({ className, variant = 'default', size = 'md', ...props }) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
      variant === 'primary' && 'bg-accent text-black hover:brightness-110',
      variant === 'default' && 'border border-border bg-surface text-ink hover:bg-canvas',
      variant === 'danger' && 'bg-risk-CRITICAL/90 text-white hover:brightness-110',
      variant === 'ghost' && 'text-muted hover:text-ink hover:bg-canvas',
      className
    )}
    {...props}
  />
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input className={clsx('w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40', className)} {...props} />
);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select className={clsx('rounded-md border border-border bg-canvas px-2.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40', className)} {...props} />
);
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
  <textarea className={clsx('w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40', className)} {...props} />
);
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
  <label className={clsx('mb-1.5 block text-sm font-medium text-ink', className)} {...props} />
);

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium font-mono', `bg-risk-${level}`, `risk-${level}`)}>{level}</span>;
}

const DECISION_STYLE: Record<Decision, string> = {
  ALLOW: 'bg-risk-LOW text-[#3fae7a]', BLOCK: 'bg-risk-CRITICAL text-[#d64545]', REQUIRES_APPROVAL: 'bg-risk-MEDIUM text-[#d9a441]',
};
export function DecisionBadge({ decision }: { decision: Decision }) {
  return <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', DECISION_STYLE[decision])}>{titleCase(decision)}</span>;
}

const STATUS_STYLE: Record<ActionStatus | ApprovalStatus, string> = {
  EXECUTED: 'bg-risk-LOW text-[#3fae7a]', APPROVED: 'bg-risk-LOW text-[#3fae7a]',
  BLOCKED: 'bg-risk-CRITICAL text-[#d64545]', REJECTED: 'bg-risk-CRITICAL text-[#d64545]',
  PENDING_APPROVAL: 'bg-risk-MEDIUM text-[#d9a441]', PENDING: 'bg-risk-MEDIUM text-[#d9a441]',
  FAILED: 'bg-risk-HIGH text-[#e2683a]', EXPIRED: 'border border-border text-muted',
};
export function StatusBadge({ status }: { status: ActionStatus | ApprovalStatus }) {
  return <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>{titleCase(status)}</span>;
}

export function StatusDot({ active }: { active: boolean }) {
  return <span className={clsx('inline-block h-1.5 w-1.5 rounded-full', active ? 'bg-[#3fae7a]' : 'bg-muted')} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded bg-border/60', className)} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface py-16 text-center">
      <AlertTriangle size={20} className="text-risk-HIGH" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
      <Inbox size={20} className="text-muted" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>;
}
export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...p }) => (
  <th className={clsx('border-b border-border px-3 py-2 text-left text-xs font-medium text-muted', className)} {...p} />
);
export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...p }) => (
  <td className={clsx('border-b border-border/70 px-3 py-2.5 align-middle text-ink', className)} {...p} />
);
export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, ...p }) => (
  <tr className={clsx('hover:bg-canvas/70', className)} {...p} />
);

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onClick={onClose}>
      <div className={clsx('w-full rounded-md border border-border bg-surface p-5 shadow-card', wide ? 'max-w-2xl' : 'max-w-md')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
