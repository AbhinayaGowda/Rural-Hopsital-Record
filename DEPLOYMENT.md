# Deployment Guide — Rural Digital Health Record System

This guide walks through deploying the full stack from scratch:
**Supabase** (database + auth + storage) → **Render** (Express API) → **Vercel** (React client).

Follow the sections in order. Each section depends on values from the previous one.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase Setup](#2-supabase-setup)
3. [Run All Migrations](#3-run-all-migrations)
4. [Create Storage Bucket](#4-create-storage-bucket)
5. [Seed Initial Data](#5-seed-initial-data)
6. [Create the First Admin User](#6-create-the-first-admin-user)
7. [Deploy the Server on Render](#7-deploy-the-server-on-render)
8. [Deploy the Client on Vercel](#8-deploy-the-client-on-vercel)
9. [Link Client ↔ Server](#9-link-client--server)
10. [Post-Deployment Checklist](#10-post-deployment-checklist)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Redeployment & Migrations](#12-redeployment--migrations)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum version | Why |
|---|---|---|
| Node.js | 20.x | Server runtime |
| npm | 10.x | Package manager |
| Supabase CLI | latest | Running migrations |
| Git | any | Repo management |

Accounts you need:
- [supabase.com](https://supabase.com) — free tier is enough for development
- [render.com](https://render.com) — free tier (spins down after inactivity; upgrade for production)
- [vercel.com](https://vercel.com) — free tier is enough

---

## 2. Supabase Setup

### 2a. Create a new project

1. Log in to [supabase.com](https://supabase.com) and click **New project**.
2. Choose an organisation, give the project a name (e.g. `rural-hospital`), set a strong database password, and pick the region closest to your users.
3. Wait for the project to finish provisioning (~2 minutes).

### 2b. Collect credentials

Go to **Project Settings → API** and copy:

| Value | Where to find it |
|---|---|
| **Project URL** | `https://<ref>.supabase.co` |
| **anon / public key** | Under "Project API keys" |
| **service_role key** | Under "Project API keys" — keep this secret |
| **JWT Secret** | Settings → API → JWT Settings |

> **Never** commit the `service_role` key or `JWT Secret` to git.

### 2c. Link Supabase CLI to the project

```bash
# Install CLI if not present
npm install -g supabase

# Log in
supabase login

# Inside the repo root
supabase link --project-ref <your-project-ref>
```

---

## 3. Run All Migrations

All migrations live in `supabase/migrations/` and must be applied in timestamp order. The CLI handles ordering automatically.

```bash
# From the repo root
supabase db push
```

This runs every `.sql` file in `supabase/migrations/` against the hosted project in order.

**What the migrations create (in order):**

| Migration | Creates |
|---|---|
| `20260420000001` | pgcrypto / unaccent extensions |
| `20260420000002` | `updated_at` auto-trigger function |
| `20260420000003` | `profiles` table + RLS |
| `20260420000004` | `households` + `members` tables + RLS |
| `20260420000005` | `audit_logs` table |
| `20260420000006` | `relationships` table |
| `20260420000007` | `doctor_visits` + `disease_history` tables |
| `20260420000008` | `pregnancies` + `pregnancy_checkups` + `newborns` |
| `20260420000009` | `vaccine_catalog` + `vaccinations` |
| `20260420000010` | `notifications` table |
| `20260420000011` | Core RPCs (change_head, register_delivery, mark_deceased, mark_migrated) |
| `20260420000012` | Search + batch RPCs |
| `20260420000013` | Partial unique index on Aadhaar |
| `20260421000001` | Location hierarchy (states / districts / cities / villages) |
| `20260421000002` | User location assignment tables |
| `20260421000003` | Household location FKs + updated RLS |
| `20260421000004` | Drop legacy permissive policies |
| `20260421000005` | `medical_conditions` table |
| `20260422000001` | `health_id` + phonetic search columns on members |
| `20260422000002` | `rpc_search_person` function |
| `20260422000003` | Backfill existing member health IDs |
| `20260422000004` | Location-scoped search RPCs |
| `20260422000005` | Reporting RPCs |
| `20260422000006` | Enhanced pregnancies columns |
| `20260422000007` | `referrals` table |
| `20260426000001` | Notification channel columns |
| `20260426000002` | Outbreak detection RPC |
| `20260426000003` | GPS columns on households |
| `20260426000004` | ABHA field, field visits, attachments tables |
| `20260426000005` | Duplicate household detection RPC |
| `20260426000006` | Free-text vaccine name column |
| `20260427000001` | Seed: 389 Maharashtra villages |
| `20260427000002` | Create `health-attachments` storage bucket |
| `20260427000007` | Partial unique index on vaccinations (member + vaccine_code) |
| `20260427000008` | Unique constraint on vaccinations (member + vaccine_code) |

After pushing, verify in the Supabase dashboard under **Table Editor** that tables like `households`, `members`, `pregnancies`, and `vaccinations` are present.

---

## 4. Create Storage Bucket

Migration `20260427000002` creates the `health-attachments` bucket automatically via SQL. Verify it exists:

1. Go to **Storage** in the Supabase dashboard.
2. Confirm a bucket named `health-attachments` is listed as **private**.

If it is missing, run manually in the Supabase SQL editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-attachments', 'health-attachments', false, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

---

## 5. Seed Initial Data

The vaccine catalog must be seeded so vaccination scheduling works:

```bash
supabase db seed   # runs supabase/seed.sql against the hosted project
```

Or paste `supabase/seed.sql` directly into the Supabase SQL editor.

The seed file populates:
- `vaccine_catalog` — BCG, OPV_0, HEP_B_BIRTH, DPT series, etc.
- Demo households/members (development only — remove before production)

---

## 6. Create the First Admin User

The application has no public sign-up page. All users are created by an admin.

**Step 1 — Create the auth user via Supabase dashboard:**

1. Go to **Authentication → Users → Add user**.
2. Enter the admin email and a strong password.
3. Click **Create user**.

**Step 2 — Promote to admin role:**

By default the `on_auth_user_created` trigger inserts a `profiles` row with `role = 'ground_staff'`. Promote this user manually:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@example.com');
```

Run this in the Supabase SQL editor.

This admin can then create and manage all other users through the app's **Admin → Users** page.

---

## 7. Deploy the Server on Render

### 7a. Create the Web Service

1. Log in to [render.com](https://render.com) and click **New → Web Service**.
2. Connect your GitHub/GitLab repo.
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `rural-hospital-api` (or any name) |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

> Render injects `PORT` automatically — do **not** set it manually.

### 7b. Set environment variables on Render

In the Render dashboard → your service → **Environment**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key (mark as secret) |
| `SUPABASE_JWT_SECRET` | Your JWT secret (mark as secret) |
| `CORS_ORIGIN` | Leave blank for now — fill in after Vercel deploy (step 9) |
| `ENABLE_SMS` | `false` (set to `true` only if MSG91 is configured) |
| `MSG91_API_KEY` | Your MSG91 API key (optional — for SMS notifications) |
| `MSG91_SENDER_ID` | Your MSG91 sender ID (optional) |

### 7c. Deploy

Click **Deploy**. Render will run `npm install` and start the server. Watch the logs — a successful start prints:

```
Server running on port <PORT>
```

Note the service URL (e.g. `https://rural-hospital-api.onrender.com`) — you need it for the Vercel setup.

---

## 8. Deploy the Client on Vercel

### 8a. Import the project

1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your Git repo.
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 8b. Set environment variables on Vercel

In the project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon/public key |
| `VITE_API_BASE_URL` | `https://rural-hospital-api.onrender.com/api` |

> `VITE_` prefix is required — Vite only exposes variables with this prefix to the browser bundle.

### 8c. Deploy

Click **Deploy**. Vercel builds the React app and serves it on a `.vercel.app` URL.

`client/vercel.json` already contains the SPA rewrite rule so React Router routes don't 404 on refresh:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 9. Link Client ↔ Server

After both services are live you need to set the CORS origin on Render so the API accepts requests from the Vercel domain.

1. Copy the Vercel app URL (e.g. `https://rural-hospital.vercel.app`).
2. Go to Render → your service → **Environment**.
3. Set `CORS_ORIGIN` to the Vercel URL.
   - If you have multiple origins (e.g. a custom domain + vercel.app), separate them with commas:
     ```
     https://rural-hospital.vercel.app,https://yourdomain.com
     ```
4. Render will automatically redeploy with the new env var.

---

## 10. Post-Deployment Checklist

Work through this list after first deploy to confirm everything is wired up correctly.

### Infrastructure
- [ ] `GET https://<render-url>/api/health` returns `{ "ok": true }`
- [ ] Vercel app loads without a blank screen
- [ ] No `CORS` errors in the browser console

### Authentication
- [ ] Admin user can log in
- [ ] After login, the correct role-based nav appears (Admin sees Users + Locations links)
- [ ] Log out works and redirects to login page

### Households & Members
- [ ] Admin can create a new household with state / district / village
- [ ] Village auto-creates if typed manually
- [ ] Member can be added to the household
- [ ] Household detail page loads with member list

### Vaccinations
- [ ] Pending vaccinations show "Mark Done" button
- [ ] Marking a vaccination done updates status to `completed`
- [ ] "+ Log Vaccine" free-text entry works

### Pregnancies
- [ ] New pregnancy can be added (as doctor)
- [ ] Checkup can be logged via "▸ Checkups → + Log Checkup"
- [ ] "Mark Delivered" → DeliveryForm → confirm creates newborn member + seeds birth vaccines

### Health Cards
- [ ] Member detail → "↓ Health Card" downloads a PDF (not a 401/403)
- [ ] Household detail → "↓ Health Card" downloads a PDF

### Attachments
- [ ] Upload an image on member Info tab → thumbnail appears
- [ ] PDF upload appears as a file icon
- [ ] Delete removes the attachment

### Notifications
- [ ] Server logs show notification worker started (check Render logs)

---

## 11. Environment Variables Reference

### `client/.env` (Vercel environment variables)

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_BASE_URL=https://<render-service>.onrender.com/api
```

### `server/.env` (Render environment variables)

```
PORT=4000                             # Render injects this — do not set manually
NODE_ENV=production
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # SECRET — never expose to client
SUPABASE_JWT_SECRET=<jwt-secret>               # SECRET
CORS_ORIGIN=https://<vercel-app>.vercel.app    # comma-separated for multiple origins
ENABLE_SMS=false                               # set true to activate MSG91 notifications
MSG91_API_KEY=                                 # required if ENABLE_SMS=true
MSG91_SENDER_ID=                               # required if ENABLE_SMS=true
```

---

## 12. Redeployment & Migrations

### Deploying code changes

- **Client**: push to the connected branch → Vercel auto-deploys.
- **Server**: push to the connected branch → Render auto-deploys.

### Adding a new migration

1. Create the SQL file in `supabase/migrations/` with a timestamped name:
   ```
   supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```
2. Apply it to the hosted project:
   ```bash
   supabase db push
   ```
3. Commit the file to git so the migration history stays in sync.

> Never apply schema changes directly in the Supabase dashboard without also adding the corresponding migration file to the repo.

---

## 13. Troubleshooting

### API returns `401 Unauthorized` / `Missing token`
- The client is likely calling a URL directly (e.g. an `<a href>`) instead of going through `apiFetch`. All API calls must use the wrappers in `client/src/api/` which attach the Bearer token.

### Health card download fails with `401`
- Confirm the download uses `apiFetchDownload` (not a plain `<a href>`). Check `client/src/api/members.js` and `households.js`.

### CORS error in the browser
- Check `CORS_ORIGIN` on Render includes the exact Vercel URL (no trailing slash).
- Multiple origins must be comma-separated with no spaces.

### `there is no unique constraint matching the ON CONFLICT specification`
- Run migration `20260427000008` against the hosted database:
  ```bash
  supabase db push
  ```

### Village dropdown is empty
- Migration `20260427000001` seeds 389 Maharashtra villages. Confirm it ran:
  ```sql
  SELECT COUNT(*) FROM villages;
  ```
  Expected: ≥ 389 rows.

### Render service sleeps (free tier)
- Free Render services spin down after 15 minutes of inactivity and take ~30 seconds to wake on the next request. Upgrade to a paid plan for production, or use a cron ping service to keep it warm.

### `supabase db push` fails with "already exists"
- All migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` and are idempotent. If a specific migration fails, inspect the error — it is usually a naming conflict from a manual change made in the dashboard. Fix the migration SQL and re-run.

### Notifications not sending
- Confirm the notification worker started — check Render logs for `Notification worker started`.
- If SMS is needed, set `ENABLE_SMS=true` and add `MSG91_API_KEY` + `MSG91_SENDER_ID` in Render env vars.
