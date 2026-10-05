import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { csrfGuard, requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agents.routes';
import policyRoutes from './routes/policies.routes';
import actionRoutes from './routes/actions.routes';
import auditRoutes from './routes/audit.routes';
import approvalRoutes from './routes/approvals.routes';
import toolRoutes from './routes/tools.routes';
import securityRoutes from './routes/securityEvents.routes';
import notificationRoutes from './routes/notifications.routes';
import evaluationRoutes from './routes/evaluations.routes';
import analyticsRoutes from './routes/analytics.routes';
import demoRoutes from './routes/demo.routes';
import orgRoutes from './routes/org.routes';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi';
import gatewayRoutes from './routes/agentGateway.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // Swagger UI needs inline scripts, so it gets its own relaxed headers and is mounted before global helmet.
  app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openapi as any, { customSiteTitle: 'AgentGuard API' }));
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));

  app.use(helmet());
  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-AgentGuard-Client'],
  }));
  if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(globalLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // Agent-facing gateway (API-key auth, no cookies -> no CSRF surface)
  app.use('/api/agent-actions', gatewayRoutes);

  // Dashboard-facing API (cookie auth)
  app.use('/api/auth', csrfGuard, authRoutes);
  app.use('/api/agents', csrfGuard, requireAuth, agentRoutes);
  app.use('/api/policies', csrfGuard, requireAuth, policyRoutes);
  app.use('/api/actions', csrfGuard, requireAuth, actionRoutes);
  app.use('/api/audit-logs', csrfGuard, requireAuth, auditRoutes);
  app.use('/api/approvals', csrfGuard, requireAuth, approvalRoutes);
  app.use('/api/tools', csrfGuard, requireAuth, toolRoutes);
  app.use('/api/security-events', csrfGuard, requireAuth, securityRoutes);
  app.use('/api/notifications', csrfGuard, requireAuth, notificationRoutes);
  app.use('/api/evaluations', csrfGuard, requireAuth, evaluationRoutes);
  app.use('/api/analytics', csrfGuard, requireAuth, analyticsRoutes);
  app.use('/api/demo', csrfGuard, requireAuth, demoRoutes);
  app.use('/api/org', csrfGuard, requireAuth, orgRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
