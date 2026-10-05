import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Card, ErrorState, Input, Label, LoadingState, Modal, PageHeader, Select, Table, Td, Th, Tr } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import type { Member, Organization } from '../types';
import { formatDate, titleCase } from '../utils/format';
import { can } from '../utils/rbac';

function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const add = useMutation({ mutationFn: () => api.post('/api/org/members', form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['org'] }); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Temporary password</Label><Input type="text" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><Label>Role</Label><Select className="w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{['ADMIN', 'SECURITY_ANALYST', 'DEVELOPER', 'VIEWER'].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</Select></div>
        {add.isError && <p className="text-sm text-risk-CRITICAL">{(add.error as any).message}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add member'}</Button>
      </form>
    </Modal>
  );
}

export default function Settings() {
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['org'], queryFn: () => api.get<{ organization: Organization; members: Member[] }>('/api/org') });
  const changeRole = useMutation({ mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/api/org/members/${userId}`, { role }), onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }) });
  const remove = useMutation({ mutationFn: (userId: string) => api.delete(`/api/org/members/${userId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }) });
  const canManage = can(role, 'org:manage_members');

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Could not load organization." />;

  return (
    <div>
      <PageHeader title="Settings" description={`${data.organization.name} · ${data.organization.slug}`} actions={canManage && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> Add member</Button>} />
      <Card className="p-0">
        <Table>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th>{canManage && <Th></Th>}</tr></thead>
          <tbody>
            {data.members.map((m) => (
              <Tr key={m.userId}>
                <Td className="font-medium">{m.name}</Td>
                <Td className="text-muted">{m.email}</Td>
                <Td>
                  {canManage && m.role !== 'OWNER'
                    ? <Select value={m.role} onChange={(e) => changeRole.mutate({ userId: m.userId, role: e.target.value })}>{['ADMIN', 'SECURITY_ANALYST', 'DEVELOPER', 'VIEWER'].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</Select>
                    : titleCase(m.role)}
                </Td>
                <Td className="text-muted">{formatDate(m.joinedAt)}</Td>
                {canManage && <Td>{m.role !== 'OWNER' && <button onClick={() => confirm(`Remove ${m.name}?`) && remove.mutate(m.userId)} className="text-muted hover:text-risk-CRITICAL"><Trash2 size={14} /></button>}</Td>}
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <AddMemberModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
