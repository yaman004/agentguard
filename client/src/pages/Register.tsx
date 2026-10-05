import { ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, useRegister } from '../hooks/useAuth';
import { Button, Input, Label } from '../components/ui';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const register = useRegister();
  const navigate = useNavigate();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form, { onSuccess: () => navigate('/dashboard') });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent"><ShieldCheck size={18} /></div>
          <span className="text-base font-semibold text-ink">AgentGuard</span>
        </div>
        <div className="rounded-md border border-border bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Create your organization</h1>
          <p className="mt-1 text-sm text-muted">You'll be the owner and can invite your team afterwards.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div><Label htmlFor="organizationName">Organization name</Label><Input id="organizationName" required value={form.organizationName} onChange={set('organizationName')} /></div>
            <div><Label htmlFor="name">Your name</Label><Input id="name" required value={form.name} onChange={set('name')} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} /></div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={set('password')} />
              <p className="mt-1 text-xs text-muted">At least 10 characters.</p>
            </div>
            {register.isError && <p className="text-sm text-risk-CRITICAL">{(register.error as ApiError).message}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={register.isPending}>{register.isPending ? 'Creating…' : 'Create organization'}</Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">Already have an account? <Link to="/login" className="text-accent">Log in</Link></p>
      </div>
    </div>
  );
}
