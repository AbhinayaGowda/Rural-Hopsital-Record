# Deployment

## Vercel — client

1. Import the repo in Vercel.
2. Set **Root Directory** to `client`.
3. Framework preset: **Vite**.
4. Build command: `npm run build` · Output dir: `dist`.
5. Add environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | From Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | From Supabase project → Settings → API |
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api` |

`client/vercel.json` already contains the SPA rewrite so react-router routes don't 404 on refresh.

---

## Render — server

1. Create a new **Web Service** and connect the repo.
2. Set **Root Directory** to `server`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Health check path: `/api/health`
6. Add environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | From Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase project → Settings → API (secret) |
| `SUPABASE_JWT_SECRET` | From Supabase project → Settings → API → JWT Settings |
| `CORS_ORIGIN` | `https://<your-vercel-app>.vercel.app` (comma-separate if multiple) |

`PORT` is injected automatically by Render — do not set it manually.

`render.yaml` at the repo root mirrors these settings for infrastructure-as-code reference.

---

## Supabase

No separate deploy step. Both Vercel and Render connect directly to the hosted Supabase project. Run migrations against the hosted project via:

```bash
supabase db push
```

or apply them through the Supabase MCP as done during development.
