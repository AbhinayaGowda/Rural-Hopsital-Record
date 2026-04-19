# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. Project Overview

**Rural Digital Health Record System** — a household-centric health tracking platform that replaces paper-based bookkeeping in rural clinics. The unit of tracking is the **household**, identified by a unique `malaria_number`. Every member of the house links to that household, and their medical history, pregnancies, newborn records, vaccinations, death/migration status, and doctor visits are stored relationally.

Primary users:
- **Doctors** — view full patient records, log visits, prescribe, schedule follow-ups.
- **Ground staff** — register households, add/update members, mark migrations and deaths.
- **Admins** — full access, user management, reporting.

Design priorities (in order):
1. **Data integrity** — medical/government records. Never hard-delete. Always audit.
2. **Role isolation** — enforced at the database layer via Supabase RLS, not just in the UI.
3. **Offline-tolerant flows** — ground staff often work with flaky connectivity; mutations must be idempotent and retry-safe.
4. **Simple UI** — field workers are not technical; favor large tap targets, clear labels, minimal nesting.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite** | No Next.js. No Tailwind. |
| Styling | **Plain CSS + CSS Modules** | One `.module.css` per component. Global tokens in `src/styles/tokens.css`. |
| Routing | `react-router-dom` v6 | |
| State | React Context + `useReducer` for auth/session; component-local state otherwise | No Redux. |
| Data fetching | `@tanstack/react-query` | All server state goes through it. |
| Backend | **Express 4 (Node 20)** | Thin API layer; business logic + orchestration. |
| Database + Auth | **Supabase** (Postgres 15) | Auth, RLS, storage. |
| Supabase access | `@supabase/supabase-js` v2 | Two clients — see §6. |
| Validation | `zod` on both client and server | Share schemas via `/shared`. |
| Env | `dotenv` on server; Vite `import.meta.env` on client | |

---

## 3. Folder Structure

```
/
├── client/                         React app (Vite)
│   ├── src/
│   │   ├── api/                    Thin wrappers around fetch → express
│   │   ├── components/             Reusable UI (Button, Input, Modal, Table)
│   │   ├── features/               Feature-scoped modules
│   │   │   ├── households/
│   │   │   ├── members/
│   │   │   ├── pregnancy/
│   │   │   ├── newborn/
│   │   │   ├── vaccinations/
│   │   │   ├── visits/
│   │   │   └── audit/
│   │   ├── pages/                  Route-level components
│   │   ├── hooks/                  useAuth, useRole, useDebounce, etc.
│   │   ├── context/                AuthContext, NotificationContext
│   │   ├── lib/                    supabaseClient.js, queryClient.js
│   │   ├── styles/                 tokens.css, reset.css, global.css
│   │   ├── utils/                  date.js, format.js, permissions.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
├── server/                         Express API
│   ├── src/
│   │   ├── routes/                 One file per resource
│   │   ├── controllers/            Request handlers
│   │   ├── services/               Business logic, Supabase calls
│   │   ├── middleware/             auth, requireRole, errorHandler, audit
│   │   ├── lib/                    supabaseAdmin.js, logger.js
│   │   ├── validators/             zod schemas
│   │   └── index.js
│   └── .env.example
│
├── shared/                         Types / zod schemas used by both sides
│   └── schemas/
│
├── supabase/
│   ├── migrations/                 SQL migrations (timestamped)
│   └── seed.sql                    Dev seed data
│
├── CLAUDE.md                       This file
└── README.md
```

---

## 4. Supabase MCP Usage — Read This Carefully

Claude Code has access to the Supabase MCP server. Use it as the **source of truth** for schema state. Do not assume — verify.

### Rules

1. **Before writing any migration, inspect first.** Call `list_tables`, `list_extensions`, and relevant `describe_*` tools. Never create a table you haven't confirmed is missing.
2. **All schema changes go through `apply_migration`** with a descriptive name (e.g. `create_households_table`, `add_rls_pregnancies`). Never hand-edit in the dashboard for anything that should live in git.
3. **Idempotent SQL.** Use `create table if not exists`, `drop policy if exists ... ; create policy ...`, etc. Migrations must be re-runnable without breaking.
4. **Test with `execute_sql`** for read-only verification after each migration. Never use `execute_sql` to make schema changes — it's for `select` only.
5. **RLS is mandatory** on every table that holds user or patient data. A table without RLS enabled is a bug.
6. **After every migration, mirror the SQL into `/supabase/migrations/`** with a timestamped filename like `20260420_create_households.sql`. The MCP and the repo must stay in sync.
7. **Do not expose the `service_role` key to the client.** Ever. It's only used server-side in `server/src/lib/supabaseAdmin.js`.

### Typical MCP workflow for a new feature

```
1. list_tables                              → confirm current state
2. apply_migration(name, sql)                → create table + indexes
3. apply_migration(name, sql)                → enable RLS + policies
4. execute_sql("select * from ... limit 1")  → verify structure
5. Write SQL file into supabase/migrations/
6. Update zod schemas in /shared/schemas
7. Build API route + controller + service
8. Build React feature folder
```

---

## 5. Database Schema

All tables use `uuid` primary keys (`default gen_random_uuid()`), `created_at timestamptz default now()`, and `updated_at timestamptz default now()` with a trigger. Use the `public` schema.

### Core tables

**`profiles`** — extends `auth.users`
- `id uuid PK references auth.users(id) on delete cascade`
- `full_name text not null`
- `role text not null check (role in ('doctor','ground_staff','admin'))`
- `phone text`
- `is_active boolean default true`

**`households`**
- `id uuid PK`
- `malaria_number text unique not null` — **the permanent household identifier**
- `address_line text`, `village text`, `district text`, `state text`, `pincode text`
- `head_member_id uuid references members(id)` — nullable initially, set after first member added
- `status text check (status in ('active','migrated','dissolved')) default 'active'`
- `migrated_at timestamptz`, `notes text`
- `created_by uuid references profiles(id)`
- Index on `malaria_number`, `village`, `status`

**`members`**
- `id uuid PK`
- `household_id uuid references households(id) on delete restrict not null`
- `full_name text not null`, `gender text check (gender in ('M','F','O'))`
- `date_of_birth date`, `aadhaar text` (nullable, unique when not null)
- `relation_to_head text` — `self`, `spouse`, `son`, `daughter`, `parent`, `sibling`, `other`
- `is_head boolean default false`
- `contact_number text`
- `status text check (status in ('active','deceased','migrated','pregnant','follow_up')) default 'active'`
- `deceased_date date`, `migrated_date date`
- `created_by uuid references profiles(id)`
- Partial unique: `(household_id) where is_head = true` — only one head per household.
- Index on `household_id`, `status`, `full_name`

**`relationships`** — for dynamic re-computation when head changes
- `id uuid PK`
- `member_id uuid not null`, `related_member_id uuid not null`
- `relationship_type text not null` (e.g. `spouse_of`, `child_of`, `sibling_of`)
- Unique on `(member_id, related_member_id, relationship_type)`

**`doctor_visits`**
- `id uuid PK`
- `member_id uuid references members(id) not null`
- `doctor_id uuid references profiles(id) not null`
- `visit_date date not null default current_date`
- `symptoms text`, `diagnosis text`, `prescription text`, `notes text`
- `follow_up_date date`
- Index on `member_id`, `visit_date desc`

**`disease_history`**
- `id uuid PK`, `member_id uuid FK not null`
- `disease_name text not null`, `diagnosed_on date`, `recovered_on date`
- `status text check (status in ('active','recovered','chronic'))`
- `notes text`, `recorded_by uuid references profiles(id)`

**`pregnancies`**
- `id uuid PK`, `member_id uuid FK not null` (the pregnant woman — must be gender F)
- `lmp_date date` (last menstrual period), `expected_due_date date`
- `actual_delivery_date date`
- `risk_level text check (risk_level in ('low','medium','high')) default 'low'`
- `status text check (status in ('active','delivered','miscarried','terminated'))`
- `notes text`
- Check constraint: cannot have two `active` pregnancies for same member.

**`pregnancy_checkups`**
- `id uuid PK`, `pregnancy_id uuid FK not null`
- `checkup_date date not null`, `week_number int`
- `weight_kg numeric(5,2)`, `bp_systolic int`, `bp_diastolic int`, `hemoglobin numeric(4,2)`
- `doctor_id uuid references profiles(id)`, `notes text`
- `next_checkup_date date`

**`newborns`**
- `id uuid PK`
- `pregnancy_id uuid FK not null unique`
- `member_id uuid FK unique not null` — the newly-created member record for the baby
- `birth_weight_kg numeric(4,2)`, `delivery_type text` (`normal`, `c-section`, `assisted`)
- `complications text`, `recorded_by uuid references profiles(id)`

**`vaccine_catalog`** (seed data — no user writes)
- `code text PK` (e.g. `BCG`, `OPV_0`, `HEP_B_BIRTH`, `DPT_1`)
- `name text`, `recommended_age_days int`, `sequence_order int`

**`vaccinations`**
- `id uuid PK`, `member_id uuid FK not null`
- `vaccine_code text references vaccine_catalog(code)`
- `scheduled_date date`, `administered_date date`
- `status text check (status in ('pending','completed','missed','skipped')) default 'pending'`
- `administered_by uuid references profiles(id)`, `notes text`
- Unique: `(member_id, vaccine_code)`

**`notifications`**
- `id uuid PK`, `recipient_user_id uuid FK profiles`
- `type text` (`checkup_reminder`, `vaccination_due`, `follow_up`)
- `related_entity_type text`, `related_entity_id uuid`
- `message text`, `scheduled_for timestamptz`, `sent_at timestamptz`, `read_at timestamptz`

**`audit_logs`** — append-only
- `id uuid PK`, `actor_id uuid references profiles(id)`
- `action text` (`insert`, `update`, `delete`, `status_change`)
- `table_name text`, `record_id uuid`
- `old_data jsonb`, `new_data jsonb`
- `created_at timestamptz default now()`
- **No update or delete triggers allowed on this table.**

### Key invariants

- A member cannot be deleted. Only status changes are allowed (`deceased`, `migrated`).
- A household cannot be deleted while it has active members.
- When `members.is_head` changes, recompute `relationships` rows and update `households.head_member_id` in a single transaction.
- When a pregnancy is marked `delivered`, an accompanying `newborns` row AND a new `members` row must be created atomically (use an RPC / Postgres function, not client-side).

---

## 6. Supabase Clients — Two Distinct Clients

### `client/src/lib/supabaseClient.js` (anon, browser)
```js
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```
Used for: **auth only** (sign-in, session, sign-out). All data reads/writes go through Express, not directly from the browser to Supabase. This keeps business logic and audit in one place.

### `server/src/lib/supabaseAdmin.js` (service_role, server)
```js
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
```
Used for: all DB operations from Express. Bypasses RLS — so the **Express middleware must enforce role checks** before calling it.

> Why this split? Medical data + audit log writes are too important to scatter across client code. Express is the chokepoint.

---

## 7. Authentication & RBAC

- Auth uses Supabase email/password. On sign-up, a trigger inserts a matching row into `profiles` with `role = 'ground_staff'` by default (admins promote manually).
- Client calls Express with `Authorization: Bearer <access_token>`.
- Express middleware `authenticate` verifies the JWT with `supabaseAdmin.auth.getUser(token)` and attaches `req.user` + `req.profile`.
- Middleware `requireRole('doctor','admin')` gates routes.

### Role permissions matrix

| Action | Ground Staff | Doctor | Admin |
|---|---|---|---|
| Create household | yes | yes | yes |
| Add / edit member demographics | yes | yes | yes |
| Mark migration | yes | yes | yes |
| Mark deceased | yes | yes | yes |
| Change household head | yes | no | yes |
| Create doctor visit | no | yes | yes |
| Prescribe / diagnose | no | yes | yes |
| Record pregnancy | yes | yes | yes |
| Record pregnancy checkup | no | yes | yes |
| Record newborn (delivery) | no | yes | yes |
| Administer vaccine | yes | yes | yes |
| View audit log | no | no | yes |
| Manage users | no | no | yes |

Enforce this in:
1. Express middleware (primary).
2. RLS policies (defense in depth — in case anything ever queries Supabase directly).
3. UI (hide buttons the user can't use — cosmetic only).

### RLS policy pattern

```sql
alter table households enable row level security;

create policy "households_select_staff" on households
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('doctor','ground_staff','admin')
        and profiles.is_active = true
    )
  );

create policy "households_insert_staff" on households
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('ground_staff','admin')
    )
  );
```

Create a helper SQL function to avoid repeating the subquery:
```sql
create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;
```

---

## 8. Coding Conventions

### JavaScript / React
- ES modules only. No CommonJS in client; server uses `"type": "module"`.
- Functional components with hooks. No class components.
- Named exports preferred. Default export only for page components and top-level feature entry points.
- File naming: `PascalCase.jsx` for components, `camelCase.js` for utilities, `kebab-case.module.css` for styles.
- Prop validation via PropTypes OR TypeScript — not both. Start with PropTypes; migrate later if needed.
- No inline `fetch` calls in components. Always go through `client/src/api/*.js` wrappers.
- Every form uses `zod` validation from `/shared/schemas`.
- Dates: store as ISO strings on the wire, use `date-fns` for formatting. Never `new Date(str)` directly on unknown input.

### CSS
- One `.module.css` per component, co-located.
- Global tokens only in `styles/tokens.css`:
  ```css
  :root {
    --color-bg: #ffffff;
    --color-surface: #f7f8fa;
    --color-text: #111827;
    --color-muted: #6b7280;
    --color-primary: #2563eb;
    --color-danger: #dc2626;
    --color-success: #16a34a;
    --radius-sm: 4px;
    --radius-md: 8px;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --font-sans: system-ui, -apple-system, sans-serif;
  }
  ```
- No CSS-in-JS. No Tailwind. No `styled-components`.
- Mobile-first media queries.

### Express
- Routes thin, controllers thin, **services hold logic**.
- Every mutation writes to `audit_logs` via the `audit` middleware or explicitly in the service.
- Use `express-async-errors` so services can throw and the error middleware catches.
- Return shape:
  ```json
  { "data": ..., "error": null }
  { "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
  ```

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Never commit `.env`. Only `.env.example`.

---

## 9. Critical Workflows — Implement These as Postgres Functions (RPC)

These must be atomic. Do **not** implement them as multiple sequential Supabase calls from Express — race conditions will corrupt records.

### `rpc_change_household_head(household_id uuid, new_head_member_id uuid)`
- Unsets `is_head` on the current head.
- Sets `is_head = true` on the new head.
- Updates `households.head_member_id`.
- Recomputes `relationships` rows (clears and regenerates based on new head).
- Writes an audit log entry.
- Wraps everything in a transaction.

### `rpc_register_delivery(pregnancy_id uuid, newborn jsonb)`
- Inserts a new `members` row for the baby (household_id inherited from the mother).
- Inserts a `newborns` row linking pregnancy → new member.
- Updates `pregnancies.status = 'delivered'`, sets `actual_delivery_date`.
- Seeds `vaccinations` rows from `vaccine_catalog` where `recommended_age_days <= 0` (birth vaccines) with `status = 'pending'` and `scheduled_date = birth_date + recommended_age_days`.
- Writes an audit log entry.

### `rpc_mark_deceased(member_id uuid, deceased_date date, cause text)`
- Sets `members.status = 'deceased'`, `deceased_date`.
- Cancels pending `vaccinations` (`status = 'skipped'`).
- Cancels active `pregnancies` (`status = 'terminated'`).
- If member was head → raises a clear error instructing to change head first (don't cascade silently).
- Writes an audit log entry.

### `rpc_mark_migrated(household_id uuid, migrated_date date)`
- Sets `households.status = 'migrated'`.
- Sets all active members' `status = 'migrated'`.
- Writes an audit log entry per member + household.

---

## 10. Commands

```bash
# Root
npm run dev           # concurrently: client + server
npm run build         # build client
npm run lint          # eslint on both

# Client (cd client)
npm run dev           # vite dev server, port 5173
npm run build
npm run preview

# Server (cd server)
npm run dev           # nodemon src/index.js, port 4000
npm run start         # node src/index.js

# Supabase (local dev)
supabase start
supabase db reset     # wipe + re-run all migrations + seed
supabase migration new <name>
supabase db push      # push local migrations to remote
```

---

## 11. Environment Variables

`client/.env`
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=http://localhost:4000/api
```

`server/.env`
```
PORT=4000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...        # NEVER commit; never send to client
SUPABASE_JWT_SECRET=...              # for verifying tokens
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## 12. Do / Don't

**Do:**
- Verify schema state via MCP before writing migrations.
- Write RLS for every new table in the same migration that creates it.
- Put atomic multi-step logic in Postgres functions, not in Express loops.
- Audit every mutation.
- Use `zod` schemas shared between client and server.
- Write seed data for every new entity so dev environments stay usable.
- Paginate any list endpoint that could exceed 50 rows.

**Don't:**
- Hard-delete rows. Ever. Use status fields.
- Expose `service_role` key to the client.
- Call Supabase directly from React components for data (auth only).
- Skip RLS because "Express already checks." Defense in depth.
- Use `select *` in production queries — list columns.
- Store PII (aadhaar, phone) in audit_logs' `new_data` without masking.
- Trust client-supplied `created_by` / `actor_id` — always derive from `req.user.id` on the server.

---

## 13. Open Questions / Deferred

These are intentionally not built yet — note them when touching related code:
- Offline queue for ground staff (PWA + IndexedDB sync). Phase 2.
- SMS notifications for checkup reminders. Phase 2 (needs gateway).
- Analytics dashboard with charts. Phase 2.
- Multi-language UI (Hindi, Marathi). Phase 2 — keep strings in a single `i18n/en.json` for now so extraction is trivial later.

---

## 14. When in doubt

1. Read this file.
2. Inspect the database via MCP — don't guess.
3. Check `/supabase/migrations/` for the canonical schema history.
4. Prefer adding a migration + RPC over spreading logic across three Express calls.
5. If a change touches `members`, `households`, `pregnancies`, or `audit_logs` — think twice, then write tests.

---

## 15. Deployment

Client → **Vercel** (root dir: `client`). Server → **Render** (root dir: `server`). See `DEPLOYMENT.md` for step-by-step setup.

### Constraints — do not break these

- **No hardcoded URLs.** Client reads `VITE_API_BASE_URL` from env everywhere via `client/src/api/client.js`. Never write `localhost:4000` in source.
- **CORS is a comma-separated env var.** `CORS_ORIGIN=https://foo.vercel.app,http://localhost:5173`. Server splits on `,` — adding a new origin means updating the env var, not the code.
- **`PORT` is injected by Render.** Use `process.env.PORT || 4000`. Never hardcode 4000 in production paths.
- **`trust proxy`** is set to `1` in `server/src/index.js`. Required for correct `req.ip` and secure cookies behind Render's proxy.
- **Health check** is `GET /api/health → { ok: true }`. Render polls this; do not change the shape or path.
- **Independent installs.** Vercel runs `npm install` + `npm run build` inside `client/`. Render runs `npm install` + `npm start` inside `server/`. The root `package.json` has no `postinstall` and must never grow one that touches both sides.
- **`client/vercel.json`** contains the SPA rewrite (`/* → /index.html`). Do not delete it.
