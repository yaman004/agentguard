import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Notification } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? window.location.origin;
type Handlers = Partial<Record<
  'agent_action' | 'action_updated' | 'policy_violation' | 'approval_created' | 'approval_completed' | 'security_alert' | 'agent_status_changed' | 'notification',
  (payload: any) => void
>>;

/** One socket per session, authenticated with a short-lived token (works across Vercel/Railway origins). */
export function useSocket(handlers: Handlers, toast?: (n: Notification) => void) {
  const status = useAuthStore((s) => s.status);
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    let socket: Socket | undefined;

    (async () => {
      const { token } = await api.get<{ token: string }>('/api/auth/socket-token');
      if (cancelled) return;
      socket = io(SOCKET_URL, { withCredentials: true, auth: { token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      (['agent_action', 'action_updated', 'policy_violation', 'approval_created', 'approval_completed', 'security_alert', 'agent_status_changed'] as const)
        .forEach((ev) => socket!.on(ev, (payload) => {
          handlersRef.current[ev]?.(payload);
          qc.invalidateQueries({ queryKey: ['analytics'] });
        }));
      socket.on('notification', (n: Notification) => { handlersRef.current.notification?.(n); toast?.(n); qc.invalidateQueries({ queryKey: ['notifications'] }); });
    })();

    return () => { cancelled = true; socket?.disconnect(); socketRef.current = null; setConnected(false); };
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected };
}
