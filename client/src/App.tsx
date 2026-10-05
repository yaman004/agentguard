import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toaster';
import { useBootstrapAuth } from './hooks/useAuth';
import AppLayout from './layouts/AppLayout';
import { LoadingState } from './components/ui';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Policies from './pages/Policies';
import Tools from './pages/Tools';
import Actions from './pages/Actions';
import Approvals from './pages/Approvals';
import Security from './pages/Security';
import SecurityDetail from './pages/SecurityDetail';
import AuditLogs from './pages/AuditLogs';
import Evaluations from './pages/Evaluations';
import Demo from './pages/Demo';
import Settings from './pages/Settings';

function Protected({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return <div className="flex h-screen items-center justify-center"><LoadingState label="Loading AgentGuard…" /></div>;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Public({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  useBootstrapAuth();
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Public><Login /></Public>} />
        <Route path="/register" element={<Public><Register /></Public>} />
        <Route element={<Protected><AppLayout /></Protected>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/security" element={<Security />} />
          <Route path="/security/:id" element={<SecurityDetail />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}
