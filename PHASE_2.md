# PHASE_2.md

> Phase 2 expansion of the Rural Digital Health Record System. Extends the existing Phase 1 foundation (CLAUDE.md) without breaking current backend, frontend, database structure, or working flows. All new features are backward-compatible — existing rows, routes, and components continue to work unchanged.

---

## 0. Backward Compatibility Rules — Read First

Before writing any code for Phase 2:

1. **No breaking schema changes.** All new columns are `nullable` or have `default` values. No dropping columns. No renaming columns. No changing types.
2. **No breaking route changes.** Existing routes keep their paths, methods, response shapes, and role gates. New features get new routes.
3. **New tables only.** Where a feature needs new data, add a new table linked by FK — don't overload existing tables.
4. **Feature flags for risky additions.** SMS, ABHA integration — gate behind env flags so they can be disabled without code changes.
5. **Every migration is additive and idempotent.** `create table if not exists`, `alter table add column if not exists` (or guarded with `do $$ ... $$`).
6. **Existing data must continue to work.** Households registered without location scope, members without Person ID, pregnancies without risk flags — all must function normally. Backfill scripts run lazily, never as migration blockers.
7. **Online only.** The system requires an active internet connection. No PWA, no service worker, no offline queue. All mutations go directly to the server in real time.

---

## 1. Person Search Key (Health ID) — NEW FLAGSHIP FEATURE

**Problem:** Searching for a specific person across hundreds of households is currently difficult. Ground staff and doctors remember names, but names collide ("Ramesh Patil" appears in 40 villages). Aadhaar is often missing or wrong. There's no short, universal, speakable identifier per person.

**Solution:** Every `members` row gets a **Health ID** — a short, globally unique, human-friendly code that can be searched from any login, printed on a physical slip, and spoken over the phone.

### Format

```
HID-XX-####-Y

Example: HID-MH-8K3F-2
```

- `HID` — fixed prefix
- `XX` — state code (MH, UP, KA, etc.), derived from household's state at registration
- `####` — 4-character base32 (no O/0/I/1 ambiguity): uses `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- `Y` — single check character (mod-32 checksum of the preceding chars) to catch typos when entered manually

Total: 12 characters, URL-safe, phone-dictatable.

### Why this format

- **Short enough** to print on a physical slip and read over a 2G phone call.
- **Checksum** catches 90%+ of single-character transcription errors without a network roundtrip.
- **State prefix** helps routing — an admin in Karnataka immediately sees "HID-MH-..." is an outsider.
- **Ambiguity-free alphabet** — no confusing O/0, I/1, so field workers don't need to clarify.
- **Independent of Aadhaar** — works for members who don't have or won't share government ID.

### Database

```sql
alter table members
  add column if not exists health_id text unique;

create index if not exists idx_members_health_id_trgm
  on members using gin (health_id gin_trgm_ops);
```

Generate on insert via a Postgres function `generate_health_id(state_code text)` that loops until it finds an unused code (collision probability is negligible for expected scale).

### Search endpoint

**New:** `GET /api/search/person?q=<query>` — **available to all authenticated roles**, scoped by the user's location access (see §3).

Matches against, in order:
1. Exact `health_id` (case-insensitive, with or without dashes)
2. Phonetic match on `full_name` (see §1.4)
3. Trigram similarity on `full_name`
4. Last-4 of `aadhaar`
5. Exact `contact_number`

Returns a unified result set: `{ member, household, match_type, match_score }`.

### Phonetic matching for Indian names

Standard Soundex is Anglo-centric and fails on Indian names (Ramesh/Rames/Ramees all diverge). Use a combination:

- **Double Metaphone** for Latin-script-friendly matching
- **Custom substitutions** for Indian transliteration variants: `v↔w`, `sh↔s`, `ph↔f`, `z↔j`, silent `h`, vowel normalization

Store a `name_phonetic text` column on `members`, computed in a trigger on insert/update.

### Printable slip

Add endpoint: `GET /api/members/:id/health-card` → returns a PDF with:
- Member name, DOB, gender, Health ID
- Household malaria number, village
- QR code encoding the Health ID
- Space for the doctor/staff to stamp

Use `pdfkit` on the Express side. Doctors print once, household keeps it.

---

## 2. Admin Panel — User, Role, and Location Management

### 2.1 User creation flow

Admins can create users manually (bypassing public sign-up). Form fields:
- Full name, email, phone
- Role: `admin` | `doctor` | `ground_staff`
- Location scope (see §3)
- Temporary password (auto-generated, 12 chars, emailed + shown once)
- Active status

New endpoint: `POST /api/admin/users` (admin only). Calls Supabase Admin API `createUser`, then inserts matching `profiles` row with role + scope.

### 2.2 User management table

New page: `/admin/users`. Table columns: name, email, role, districts assigned, villages assigned, status, last login.

Filters: role, district, village, status, search by name/email.

Actions per row:
- Edit details
- Reassign locations
- Enable / disable account
- Reset password (generates + emails new temp password)
- View audit log for this user

### 2.3 Doctor ↔ area mapping

Doctors and ground staff are mapped to one or more areas. Stored in new join tables:

```
user_district_assignments (profile_id, district_id, assigned_at, assigned_by)
user_village_assignments  (profile_id, village_id,  assigned_at, assigned_by)
```

A user can be assigned at district level (implies all villages in district) OR at village level (specific subset), OR both (mix). Admin has implicit full access; no rows needed.

### 2.4 Admin-only sections in the panel

- **Users** — §2.1–2.3
- **Locations** — §3 CRUD for states/districts/villages
- **Medical Conditions** — §5 manage local cached disease list
- **Pregnancy Overview** — §7 cross-village summary
- **House/Location Registry** — §6 map view of all registered households
- **Reports** — §11 exports
- **Audit Log** — already exists in Phase 1, now filterable by district/village

---

## 3. Location Hierarchy & Access Control

### 3.1 Schema

Four new tables, hierarchy enforced by FK:

```sql
create table states (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'MH', 'UP', 'KA' (matches Health ID prefix)
  name text not null,
  created_at timestamptz default now()
);

create table districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid references states(id) not null,
  name text not null,
  code text,                           -- optional census code
  unique (state_id, name)
);

create table cities (                  -- optional, for urban/peri-urban cases
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  name text not null,
  unique (district_id, name)
);

create table villages (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  city_id uuid references cities(id),   -- nullable
  name text not null,
  pincode text,
  centroid_lat numeric(9,6),
  centroid_lng numeric(9,6),
  unique (district_id, name)
);
```

Add to `households`:
```sql
alter table households
  add column if not exists state_id uuid references states(id),
  add column if not exists district_id uuid references districts(id),
  add column if not exists village_id uuid references villages(id);
```

Keep the existing free-text `village text`, `district text`, `state text` columns — **do not drop them**. New households populate FKs; old households continue to display the text columns. Run a lazy backfill job that attempts to resolve text → FK but doesn't fail if ambiguous.

### 3.2 Access enforcement

Two layers, both required:

**DB layer (defense in depth):** New RLS helper function:

```sql
create or replace function public.user_can_access_household(hh_id uuid)
returns boolean language sql stable security definer as $$
  select case
    when (select role from profiles where id = auth.uid()) = 'admin' then true
    else exists (
      select 1 from households h
      left join user_village_assignments uva
        on uva.profile_id = auth.uid() and uva.village_id = h.village_id
      left join user_district_assignments uda
        on uda.profile_id = auth.uid() and uda.district_id = h.district_id
      where h.id = hh_id and (uva.profile_id is not null or uda.profile_id is not null)
    )
  end
$$;
```

Update household/member/pregnancy/visit RLS policies to check this function.

**API layer (primary):** New middleware `scopeToUserLocations()` injects a `WHERE district_id IN (...) OR village_id IN (...)` filter into every list endpoint for non-admin users. Reject detail/mutation requests that target out-of-scope records with `FORBIDDEN`.

### 3.3 Backward compatibility

Households without `district_id` / `village_id` (legacy rows):
- Visible only to admins until claimed/assigned
- An admin-only "Unclassified Households" list lets admins bulk-assign them

No existing data is locked out — it just temporarily falls out of the scoped views until location is resolved.

---

## 4. Indian Location Data Integration

### 4.1 Source strategy — three layers

1. **Primary: local cached dataset** (seeded once, source of truth for dropdowns)
2. **Secondary: live API** (only to refresh cache or look up missing entries)
3. **Tertiary: manual entry** (always available as fallback)

Do **not** hit a live API on every form render — rural networks are too slow.

### 4.2 Seeding

Seed `states` with all 28 states + 8 UTs. Seed `districts` with authoritative census data (bundled as a JSON file in `server/data/in-districts.json`). Villages are too numerous to pre-seed; load on demand per district.

Recommended datasets (free, open):
- **Digital India open data**: https://data.gov.in — state/district/village lists
- **OpenStreetMap Nominatim** as a live fallback (rate-limited, respect ToS)

### 4.3 API endpoints

```
GET /api/locations/states
GET /api/locations/districts?state_id=...
GET /api/locations/cities?district_id=...
GET /api/locations/villages?district_id=...&q=...
POST /api/locations/villages        (admin only — add a missing village)
```

Every endpoint is aggressively cached (React Query `staleTime: Infinity` for states/districts, 10 min for villages).

### 4.4 UI: cascading dropdowns with fallback

```
State (required) → District (required) → City (optional) → Village (required)
```

Behavior:
- Each dropdown searchable
- If the village isn't in the list, show "Can't find it? Add manually" button
- Manual entry creates the village record (flagged `verified = false`) — admin reviews later
- Never block submission because the API is slow; dropdowns show cached data while refreshing in background

---

## 5. Medical Condition / Disease Data

### 5.1 Source

Use **ICD-10** as the base vocabulary — internationally standardized, well-documented, free to use. Seed a subset relevant to rural Indian health:

- Common infectious diseases (malaria, dengue, TB, typhoid, diarrheal diseases)
- Maternal/pregnancy conditions (anemia, gestational hypertension, pre-eclampsia)
- Chronic (diabetes, hypertension, COPD, asthma)
- Child health (malnutrition, pneumonia, measles)
- Comorbidities relevant to pregnancy risk

Bundle as `server/data/icd10-rural-india.json` (~300–500 codes, curated — not the full 70k code set).

### 5.2 Schema

```sql
create table medical_conditions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- ICD-10 code e.g. 'B50.9'
  name text not null,                     -- 'Plasmodium falciparum malaria, unspecified'
  name_short text,                        -- 'Malaria (P. falciparum)'
  category text,                          -- 'infectious', 'maternal', 'chronic', etc.
  risk_pregnancy boolean default false,   -- flag for pregnancy risk engine
  is_chronic boolean default false,
  verified boolean default true,          -- admin-added entries start false
  created_at timestamptz default now()
);
```

Update `disease_history.disease_name text` → keep the column, **add a new nullable `condition_id uuid references medical_conditions(id)`**. Old free-text entries keep working. New entries store both: normalized FK + the free text as captured.

### 5.3 Endpoint

```
GET /api/medical-conditions?q=...&category=...&limit=20
POST /api/medical-conditions    (admin only)
```

Searchable multi-select on disease/visit forms. Shows top 20 matches, filterable by category. "Can't find it? Enter manually" always available.

### 5.4 Fallback chain

1. Local DB table (always available offline once seeded)
2. Optional: hit an external medical API to suggest additions (admin reviews before activation)
3. Manual entry (free text in `disease_history.disease_name`, `condition_id` left null)

---

## 6. House Registration with Optional Live Location

### 6.1 Schema

```sql
alter table households
  add column if not exists latitude  numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists location_accuracy_m int,
  add column if not exists location_source text
    check (location_source in ('gps','manual','pin_placed','skipped'));
```

### 6.2 Capture flow

During household registration:

1. "Capture Live Location" button → browser `navigator.geolocation.getCurrentPosition` with timeout 10s
2. On success: store coordinates + accuracy, show map preview with draggable pin
3. On denial / failure / timeout: show map with a "Tap to place pin" affordance centered on the village centroid (from `villages.centroid_lat/lng`)
4. User can always skip — `location_source = 'skipped'`, form submits fine

### 6.3 Map integration — OpenStreetMap via Leaflet

Use **Leaflet + OSM tiles** (free, no API key). Wrap in a React component `<LocationPicker />` in `client/src/components/`.

Tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (attribution required — include "© OpenStreetMap contributors" in corner).

**Performance note:** Lazy-load Leaflet (~50KB gzip) only when the map is actually opened — don't bundle into the main app.

### 6.4 Admin map view

`/admin/households/map` shows all households within admin's scope as pins on an OSM map. Click a pin → household detail. Cluster pins when zoomed out (use `react-leaflet-cluster`).

Useful for: visualizing coverage, spotting unregistered pockets, outbreak response.

---

## 7. Pregnancy Tracking — Enhanced

### 7.1 Additional columns

```sql
alter table pregnancies
  add column if not exists registered_at timestamptz default now(),
  add column if not exists assigned_doctor_id uuid references profiles(id),
  add column if not exists assigned_staff_id  uuid references profiles(id),
  add column if not exists complications text[],        -- array of free text
  add column if not exists risk_factors jsonb default '{}'::jsonb,
  add column if not exists missed_checkup_count int default 0;
```

`village_id` and `district_id` are already accessible via the member → household join; no denormalization needed.

### 7.2 Automatic risk flagging

Trigger on insert/update of `pregnancies` or `pregnancy_checkups` runs `compute_pregnancy_risk(pregnancy_id)`:

**High-risk rules (any one triggers):**
- Mother age <18 or >35 at LMP
- Hemoglobin <7 g/dL in latest checkup
- BP systolic >140 or diastolic >90 in latest checkup
- Any listed complication
- Previous pregnancy ended in `miscarriage` within 2 years
- Any chronic condition flagged `risk_pregnancy = true` in `disease_history`
- 2+ consecutive missed checkups

**Medium-risk rules:**
- Hemoglobin 7–9 g/dL
- BP borderline (130–140 / 85–90)
- 1 missed checkup

Result written to `pregnancies.risk_level`. `risk_factors` jsonb stores which rules triggered, for UI tooltips.

### 7.3 Trimester tracking

Computed column (generated):

```sql
alter table pregnancies
  add column if not exists trimester int generated always as (
    case
      when expected_due_date is null or lmp_date is null then null
      when (current_date - lmp_date) < 84  then 1
      when (current_date - lmp_date) < 189 then 2
      else 3
    end
  ) stored;
```

Use this to power filters and "trimester milestones" checklists.

### 7.4 Reminders

See §9 — pregnancy checkups integrate into the notification system.

### 7.5 Dashboard enhancements

**For doctors:** "My pregnancies" view, sortable by due date, highlighted by risk. Row colors: green (low), amber (medium), red (high).

**For admins:** Village-wise pregnancy map (OSM), filters by district/village/doctor/risk/status/trimester, timeline view showing checkup adherence per pregnancy.

---

## 8. Notifications — SMS + In-App

### 8.1 Channels

| Channel | Use case | Cost |
|---|---|---|
| In-app (`notifications` table) | Always | Free |
| SMS | Pregnancy checkup reminders, missed checkup alerts, vaccination due | ~₹0.15–0.25/SMS via MSG91 or similar |
| WhatsApp (optional Phase 3) | Rich reminders with links | Per-conversation billing |

### 8.2 Schema (additive)

```sql
alter table notifications
  add column if not exists channel text default 'in_app'
    check (channel in ('in_app','sms','whatsapp')),
  add column if not exists delivery_status text default 'pending'
    check (delivery_status in ('pending','sent','failed','delivered','skipped')),
  add column if not exists external_id text,            -- gateway message ID
  add column if not exists phone_number text;
```

### 8.3 Scheduled job

A lightweight cron (node-cron or Supabase scheduled function) runs every 15 minutes:

1. Finds `notifications` where `scheduled_for <= now()` and `delivery_status = 'pending'`
2. For in-app: marks as `sent` (user sees it in UI)
3. For SMS: calls gateway (MSG91 recommended for India — Hindi template support, DND compliant), updates status from response
4. Retries failed sends up to 3 times with exponential backoff

### 8.4 Trigger rules

- Pregnancy checkup: reminder 2 days before `next_checkup_date`
- Missed pregnancy checkup: alert 1 day after `next_checkup_date` if no new checkup
- Vaccination due: reminder 3 days before `scheduled_date`
- Follow-up visit: reminder 1 day before `follow_up_date`

Feature-flagged via `ENABLE_SMS=true` — off by default, admin can toggle per deployment.

---

## 9. ~~Offline-First Support~~ — REMOVED

Offline support (PWA, service worker, IndexedDB mutation queue, idempotency keys) has been **deliberately excluded** from Phase 2. The system is **online-only**. All mutations are synchronous HTTP calls to the Express server. If connectivity is unavailable, the user sees a standard network error. No retry queue, no sync reconciliation, no idempotency key middleware.

---

## 10. Additional Features (Creative Additions)

### 10.1 Household duplicate detection

When registering a new household, fuzzy-match against existing ones in the same village:

- Trigram match on members' names
- Match on head's phone / aadhaar

If 70%+ similarity found, show: "A similar household already exists. Is this the same family?" with side-by-side comparison. Prevents duplicate registration — a massive problem in paper→digital migrations.

### 10.2 Bulk CSV import

Admin uploads a CSV of legacy paper records (households + members). System:

1. Validates rows against zod schemas
2. Flags duplicates (using §10.1 logic)
3. Shows preview with errors highlighted
4. Admin confirms → batch insert in transaction
5. Generates a report (imported / skipped / errored)

New endpoint: `POST /api/admin/import/households` (admin only, multipart upload).

### 10.3 Photo attachments

Members and visits can have photos attached (prescriptions, wound documentation, test reports). Stored in Supabase Storage.

```sql
create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('member','visit','pregnancy_checkup')),
  entity_id uuid not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes int not null,
  uploaded_by uuid references profiles(id) not null,
  uploaded_at timestamptz default now()
);
```

Max file size 5MB. Auto-compress images client-side before upload.

### 10.4 Referral tracking

Doctor refers a member to a specialist/hospital. Tracked through to outcome.

```sql
create table referrals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) not null,
  referred_by uuid references profiles(id) not null,
  referred_to text not null,              -- free text: hospital/specialist name
  reason text not null,
  urgency text check (urgency in ('routine','urgent','emergency')),
  referred_at timestamptz default now(),
  outcome text,                            -- filled in later
  outcome_recorded_at timestamptz
);
```

### 10.5 Ground staff visit log

Each ground staff visit to a village is logged (so admin knows coverage). Staff manually log a visit on arrival.

```sql
create table field_visits (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references profiles(id) not null,
  village_id uuid references villages(id) not null,
  visited_at timestamptz default now(),
  households_updated int default 0,
  members_added int default 0,
  notes text
);
```

Staff log a visit by selecting their assigned village and submitting the form. Admin dashboard shows "Villages not visited in 30+ days" — drives field planning. No automatic geolocation trigger.

### 10.6 Outbreak detection (admin)

Background job flags potential outbreaks:

> Alert when 3+ members in same village develop the same disease within 7 days.

Uses the normalized `disease_history.condition_id`. Notification goes to admin + assigned district doctor. Simple, high-impact public health feature.

### 10.7 Family health card (expanded)

Beyond the Health ID slip (§1), generate a household-level PDF card:

- Household malaria number + QR code
- All active members with names, ages, Health IDs
- Current medical conditions flagged per member
- Pending vaccinations for children
- Next pregnancy checkups if any

Endpoint: `GET /api/households/:id/health-card`. Used during ground visits — physical printout stays with family.

### 10.8 Vernacular UI — Hindi and Marathi

Add i18n layer using `react-i18next`. Strings stored in `client/src/i18n/{en,hi,mr}.json`.

User sets preferred language in profile. All labels, buttons, form hints, and error messages translate. Keep medical condition names in English (canonical) with local name in parentheses where translation is available.

Feature-flagged rollout: English launches, Hindi second, Marathi third.

### 10.9 ABHA (Ayushman Bharat Health Account) linking — optional

Indian government health ID system. Optional field on `members`:

```sql
alter table members
  add column if not exists abha_id text unique;
```

No integration with the ABHA API in Phase 2 — just store the number if a member has one. Full integration (consent-based record sharing) is Phase 3.

### 10.10 Admin reporting & exports

Admin dashboard → Reports section with:

- Household count by district/village
- Member demographics (age/gender pyramids)
- Active pregnancies by risk level
- Vaccination coverage (% under-5 fully vaccinated)
- Disease prevalence trends (last 30/90/365 days)
- Deaths and migrations by period

Each report exports to CSV and PDF. Endpoint: `POST /api/admin/reports/generate` → returns download URL.

---

## 11. Data Migration Strategy

### 11.1 Order of operations

1. **New tables** (states, districts, villages, cities, medical_conditions, assignments, attachments, referrals, field_visits, idempotency_keys) — create with `if not exists`.
2. **Seed static data** — states, districts, ICD-10 subset. Idempotent upserts.
3. **Additive columns on existing tables** — health_id, location FKs on households, trimester on pregnancies, etc. All nullable.
4. **Backfill scripts** — run as standalone Node scripts under `server/scripts/backfill/`. Each is idempotent, restartable, and logs progress. NOT in migrations.
   - `backfill-health-ids.js` — generates Health IDs for existing members
   - `backfill-location-fks.js` — best-effort match of text village/district to FKs
5. **New RLS policies** — add alongside existing ones, not replacing. Existing policies stay to avoid service interruption.
6. **New endpoints** — ship, test, then wire UI.
7. **UI rollout** — feature by feature, behind flags where risky.

### 11.2 Rollback safety

Every migration file has a documented rollback block (in comments). New columns can be dropped without data loss since they're additive. New tables can be dropped if unreferenced.

---

## 12. Indexing & Performance

Add these indexes in a dedicated migration:

```sql
-- Location access
create index on households (district_id);
create index on households (village_id);
create index on user_village_assignments (profile_id);
create index on user_district_assignments (profile_id);

-- Person search
create index on members using gin (name_phonetic gin_trgm_ops);
create index on members (contact_number) where contact_number is not null;

-- Pregnancy filters
create index on pregnancies (status, risk_level);
create index on pregnancies (assigned_doctor_id);
create index on pregnancy_checkups (next_checkup_date)
  where next_checkup_date is not null;

-- Notifications queue
create index on notifications (scheduled_for, delivery_status)
  where delivery_status = 'pending';

-- Attachments
create index on attachments (entity_type, entity_id);
```

---

## 13. Deliverables Checklist

- [ ] Migration set for all new tables and columns
- [ ] Backfill scripts (Health ID, location FKs)
- [ ] Seed scripts (states, districts, ICD-10 subset)
- [ ] `generate_health_id()` Postgres function + trigger
- [ ] `compute_pregnancy_risk()` Postgres function + trigger
- [ ] `user_can_access_household()` helper + updated RLS
- [ ] `scopeToUserLocations()` Express middleware
- [ ] New API routes: search, locations, medical-conditions, admin/users, admin/import, health-card, reports
- [ ] Leaflet `<LocationPicker />` component
- [ ] Admin panel pages: users, locations, medical conditions, reports, household map
- [ ] Notification worker (cron) + MSG91 adapter (feature-flagged via `ENABLE_SMS`)
- [ ] i18n scaffolding with English baseline
- [ ] Feature flag infrastructure (env-based toggles documented in DEPLOYMENT.md)
- [ ] Updated CLAUDE.md §5 (new tables), §7 (expanded role matrix), §15 (deployment env vars)
- [ ] Updated smoke test covering new endpoints
- [ ] PHASE_2.md stays in repo as reference

---

## 14. What's NOT in Phase 2 (deferred or excluded)

- **Offline / PWA support** — excluded entirely. System is online-only. No service worker, no IndexedDB queue, no idempotency key infrastructure.
- Full ABHA consent/record-sharing integration — Phase 3
- WhatsApp notifications — Phase 3 (requires Business API + templates)
- Voice note transcription on visits — Phase 3 (evaluate Whisper vs Google Speech first)
- AI-powered health insights / dropout prediction — Phase 3
- Real-time collaboration (two staff editing same household simultaneously) — Phase 3
- Multi-tenant support (multiple NGOs using the same deployment) — not planned

---

## 15. Core Constraint

**The system must continue working for existing users the moment any Phase 2 piece ships.** No cutover, no downtime, no data loss, no "please re-register." Every feature ships on top of what's there, and every new requirement gracefully degrades for older records that don't have the new data yet.