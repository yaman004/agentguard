import { AlertTriangle, Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface Toast { id: number; title: string; body?: string; link?: string; tone: 'info' | 'alert' | 'success' }
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const ICONS = { info: Bell, alert: ShieldAlert, success: CheckCircle2 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++counter.current;
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          const content = (
            <div className="pointer-events-auto flex items-start gap-2.5 rounded-md border border-border bg-surface p-3 shadow-card animate-[toast-in_.18s_ease-out]">
              <Icon size={16} className={t.tone === 'alert' ? 'mt-0.5 text-risk-HIGH' : t.tone === 'success' ? 'mt-0.5 text-[#3fae7a]' : 'mt-0.5 text-accent'} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 truncate text-xs text-muted">{t.body}</p>}
              </div>
            </div>
          );
          return t.link ? <Link key={t.id} to={t.link}>{content}</Link> : <div key={t.id}>{content}</div>;
        })}
      </div>
      <style>{'@keyframes toast-in { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }'}</style>
    </ToastCtx.Provider>
  );
}
export const toastIcon = AlertTriangle;
