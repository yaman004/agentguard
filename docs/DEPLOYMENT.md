# Deploying AgentGuard

## 1. MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com.
2. Database Access → add a user with a strong password.
3. Network Access → allow access from anywhere (`0.0.0.0/0`) or your hosting provider's IPs.
4. Copy the connection string → this is `MONGODB_URI`.

## 2. Upstash Redis (optional but recommended)
1. Create a free database at https://upstash.com.
2. Copy the `rediss://` connection string → this is `REDIS_URL`.
3. Without this, AgentGuard still works fully: jobs (AI analysis, evaluation runs, approval expiry) run in-process instead of via BullMQ.

## 3. Backend on Railway or Render
1. New Web Service → point at your repo, root directory `server/`.
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Environment variables (see `.env.example`):
   - `NODE_ENV=production`
   - `MONGODB_URI` (from step 1)
   - `REDIS_URL` (from step 2, optional)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate each with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `CLIENT_ORIGIN` — your Vercel URL, e.g. `https://agentguard.vercel.app` (no trailing slash)
   - `TRUST_PROXY=1` — Railway/Render sit behind a proxy
   - `OPENAI_API_KEY` (optional — enables AI risk reasoning and security-event explanations)
4. Deploy. Confirm `GET https://<your-backend>/api/health` returns `{"status":"ok"}`.
5. Run the seed script once, using the same `MONGODB_URI`: `MONGODB_URI=... npm run seed` (from your machine, or a one-off shell on the host).

## 4. Frontend on Vercel
1. Import the repo, root directory `client/`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Environment variable: `VITE_API_URL=https://<your-backend-url>`.
4. Deploy.

## 5. Connect them
- Set the backend's `CLIENT_ORIGIN` to the exact Vercel URL, then redeploy the backend (CORS and cookies depend on this matching exactly).
- Because the frontend and backend are different origins in production, cookies are issued with `SameSite=None; Secure`, which is already handled in `server/src/services/auth/auth.service.ts` when `NODE_ENV=production`.
- Real-time updates use a short-lived Socket.IO token (`GET /api/auth/socket-token`), not the cookie directly, so they work across origins too.

## 6. Verify the live flow
1. Visit the Vercel URL → Register → creates your organization.
2. Agents → New agent → copy the API key shown once.
3. Policies → add a refund limit and a delete-protection policy.
4. Demo page → run the preset scenarios and watch the pipeline trace.
5. Approvals → approve or reject a pending request and watch the toast/update arrive in real time.
6. Or call the gateway directly:
   ```bash
   curl -H "Authorization: Bearer agk_..." -H "Content-Type: application/json" \
     https://<your-backend>/api/agent-actions \
     -d '{"actionType":"refund_customer","tool":"payment_api","parameters":{"customerId":"CUS1","amount":45000}}'
   ```

## Local full-stack run (Docker)
```bash
cp .env.example .env   # set the two JWT secrets
docker compose up --build
# client:  http://localhost:5173
# server:  http://localhost:4000
# API docs: http://localhost:4000/api/docs
```

## Notes
- The seed script (`npm run seed` in `server/`) wipes and repopulates the database — only run it against a database you're happy to reset.
- Integration tests (`npm run test:integration` in `server/`) need either network access (to download `mongodb-memory-server`'s bundled MongoDB) or a real MongoDB reachable via `TEST_MONGODB_URI`.
