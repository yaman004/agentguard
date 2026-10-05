# AgentGuard

**Enterprise AI Agent Security, Governance & Observability Platform.** A real MERN + AI application: every dashboard number comes from MongoDB, every gateway decision is made by deterministic policy and risk engines, and the whole pipeline — permissions → policy → prompt-injection scan → risk scoring → decision → mock-tool execution (with DLP redaction) → audit log → real-time dashboard update — actually runs end to end.

```mermaid
flowchart LR
  A[Your AI agent / SDK] -->|Bearer agk_...| G["POST /api/agent-actions"]
  G --> P[Permissions] --> Pol[Policy engine] --> Risk[Risk engine] --> D{Decision}
  D -->|ALLOW| T[Mock tool + DLP redaction]
  D -->|REQUIRES_APPROVAL| Ap[Approval → human review]
  D -->|BLOCK| Sec[Security event]
  T --> Au[Audit log]
  Ap --> Au
  Sec --> Au
  Au --> DB[(MongoDB)]
  DB --> Dash[React dashboard]
  Au -. Socket.IO .-> Dash
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full schema and API reference, and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to put this live on Vercel + Railway/Render + Atlas + Upstash.

## What's real here
- **Auth**: register/login/logout, HTTP-only cookies, bcrypt, JWT access+refresh, RBAC (5 roles).
- **Multi-tenant**: every query is scoped by organization; cross-org access returns 404, never data.
- **Agents & API keys**: keys are shown once, only a SHA-256 hash is stored, rotation revokes the old ones.
- **Policy engine**: deterministic, unit-tested (`server/tests/engines.test.ts`), BLOCK > REQUIRES_APPROVAL > ALLOW.
- **Risk engine**: deterministic, every point attributed to a named factor — never the sole decision-maker.
- **Prompt-injection & DLP**: regex/heuristic detectors, unit-tested (`server/tests/security.test.ts`), redact before anything leaves the system.
- **Approvals**: real workflow with expiry, atomic decide, CRITICAL-risk actions require Admin/Owner.
- **Real-time**: Socket.IO, org-scoped rooms, short-lived handshake token (works across Vercel/Railway origins).
- **AI layer** (`server/src/services/ai/`): advisory only, redacted inputs, works with or without `OPENAI_API_KEY`.
- **Evaluations**: replays test cases through the exact production decision pipeline — no mocking.
- **Analytics**: every chart on `/dashboard` is a MongoDB aggregation, not a hardcoded number.
- **Background jobs**: BullMQ + Redis when `REDIS_URL` is set; the same handlers run inline otherwise.

## Run everything locally

**Option A — Docker (fastest):**
```bash
cp .env.example .env        # set the two JWT secrets (32+ chars each)
docker compose up --build
# client  http://localhost:5173
# server  http://localhost:4000  (docs at /api/docs)
```

**Option B — manual:**
```bash
docker compose up -d mongo redis     # or point at Atlas/Upstash in .env
cp .env.example .env && cd server && npm install
npm run seed                         # demo org, users, agents, policies, traffic
npm run dev                          # http://localhost:4000

# new terminal
cd client && npm install
cp .env.example .env                 # VITE_API_URL=http://localhost:4000
npm run dev                          # http://localhost:5173
```

Log in with any seeded account — password is printed by the seed script (`owner@acmedemo.test` / `DemoPass123!`, etc.) — or register your own organization.

## Tests
```bash
cd server
npm test                 # policy + risk + DLP + injection engines (fast, no DB)
npm run test:integration # full HTTP flow against a real/in-memory MongoDB
```

## Repo layout
```
client/   Vite + React + TypeScript + Tailwind dashboard
server/   Express + TypeScript + MongoDB + Socket.IO + BullMQ API
sdk/      @agentguard/sdk — TypeScript client for the gateway
docs/     Architecture and deployment guides
```

## SDK
```ts
import { AgentGuard } from '@agentguard/sdk';
const guard = new AgentGuard({ apiKey: process.env.AGENTGUARD_API_KEY!, baseUrl: 'https://your-backend.example.com' });
const result = await guard.evaluate({ type: 'refund_customer', tool: 'payment_api', parameters: { customerId: 'CUS123', amount: 45000 } });
if (result.decision === 'REQUIRES_APPROVAL') console.log('Waiting on a human:', result.approvalId);
```
