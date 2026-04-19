Requirements:

1. CORS — server reads CORS_ORIGIN from env as a comma-separated list (local + prod origins both work). No hardcoded localhost.

2. API base URL — client reads VITE_API_BASE_URL from env. No hardcoded http://localhost:4000 anywhere. All api/*.js wrappers use this.

3. Server port — app.listen(process.env.PORT || 4000). Render injects PORT.

4. Vercel config — client/vercel.json with SPA rewrite (all routes → /index.html) so react-router doesn't 404 on refresh.

5. Render config — render.yaml at repo root OR a clear section in README with: build command (cd server && npm install), start command (cd server && npm start), root directory, and the exact env vars needed.

6. Health endpoint — GET /api/health returns { ok: true } (Render uses this for health checks).

7. Trust proxy — app.set('trust proxy', 1) so req.ip works correctly behind Render's proxy.

8. Env var docs — update both .env.example files with every var that'll be needed in prod, with comments explaining which go where (Vercel dashboard vs Render dashboard vs Supabase).

9. Build scripts — root package.json should NOT have a postinstall that tries to build both. Client and server install/build independently so Vercel and Render each only touch their own folder.

10. Add a DEPLOYMENT.md with: Vercel setup steps (root dir = client, framework = vite, env vars list), Render setup steps (root dir = server, env vars list), and the Supabase env vars for each side. Keep it under a page.

Update CLAUDE.md with a new §15 "Deployment" summarizing these constraints so future changes don't break them.