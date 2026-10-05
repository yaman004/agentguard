import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Organization, Role, User } from '../types';

interface MeResponse { user: User; organization: Organization; role: Role }

export function useBootstrapAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const { data, error, isFetched } = useQuery({
    queryKey: ['me'], queryFn: () => api.get<MeResponse>('/api/auth/me'), retry: false,
  });
  useEffect(() => {
    if (data) setSession(data);
    else if (isFetched && error) clear();
  }, [data, error, isFetched]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ready: isFetched };
}

export function useLogin() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<MeResponse>('/api/auth/login', body),
    onSuccess: (data) => { setSession(data); qc.invalidateQueries(); },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; organizationName: string }) => api.post<MeResponse>('/api/auth/register', body),
    onSuccess: (data) => { setSession(data); qc.invalidateQueries(); },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => api.post('/api/auth/logout'),
    onSuccess: () => { clear(); qc.clear(); },
  });
}

export { ApiError };
