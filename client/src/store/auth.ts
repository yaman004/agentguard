import { create } from 'zustand';
import type { Organization, Role, User } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  role: Role | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  setSession: (s: { user: User; organization: Organization; role: Role }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, organization: null, role: null, status: 'loading',
  setSession: ({ user, organization, role }) => set({ user, organization, role, status: 'authenticated' }),
  clear: () => set({ user: null, organization: null, role: null, status: 'anonymous' }),
}));
