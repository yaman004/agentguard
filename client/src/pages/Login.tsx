import { ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, useLogin } from '../hooks/useAuth';
import { Button, Input, Label } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate('/dashboard') });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent"><ShieldCheck size={18} /></div>
          <span className="text-base font-semibold text-ink">AgentGuard</span>
        </div>
        <div className="rounded-md border border-border bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Log in</h1>
          <p className="mt-1 text-sm text-muted">Access your organization's agent security dashboard.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {login.isError && <p className="text-sm text-risk-CRITICAL">{(login.error as ApiError).message}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={login.isPending}>{login.isPending ? 'Logging in…' : 'Log in'}</Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">No account? <Link to="/register" className="text-accent">Create one</Link></p>
      </div>
    </div>
  );
}
