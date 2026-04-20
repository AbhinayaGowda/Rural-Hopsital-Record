# CONTRACT_FIXES.md

> API contract fixes to apply before starting Phase E (React UI). These were caught during the post-Phase-D contract review. Each item is mandatory unless marked optional. After all fixes are applied, re-run the smoke test and confirm before moving to Phase E.

---

## 1. Role drift — disease history POST

**Current:** `POST /members/:id/disease-history` is open to all staff.
**Required:** Restrict to `doctor` + `admin` only.
**Why:** Per CLAUDE.md §7, recording a disease/diagnosis is a clinical action. Ground staff should not be creating diagnostic records.

---

## 2. Role drift — pregnancy creation

**Current:** `POST /members/:id/pregnancies` is open to all staff.
**Required:** Restrict to `doctor` + `admin` only.
**Why:** Opening a clinical pregnancy record is a doctor action. Ground staff can flag a member as pregnant via member status, but the formal pregnancy record (with risk level, LMP, due date) is clinical.

---

## 3. Role drift — member demographics editing

**Current:** `PATCH /members/:id` is open to all staff.
**Required:** Restrict to `ground_staff` + `admin` only.
**Why:** Per CLAUDE.md §7, doctors do not edit demographics (address, aadhaar, contact). Doctors update clinical state via visits and disease history. Demographics are a ground-staff/admin concern.

**Optional refactor:** Split into `PATCH /members/:id/demographics` (ground_staff, admin) and reserve clinical updates to their dedicated endpoints. If splitting feels heavy, just lock the existing endpoint to ground_staff + admin.

---

## 4. Confirm vaccination administer role

**Current:** `PATCH /vaccinations/:id/administer` is "all staff."
**Required:** Confirm this means exactly the three roles `doctor`, `ground_staff`, `admin` — not literally any authenticated user. Per §7, all three can administer.
**Action:** No code change if it's already the three explicit roles. If middleware is permissive ("any authenticated"), tighten it.

---

## 5. Bug — `deliverSchema.relation_to_head` default

**Current:** `relation_to_head` defaults to `'son'` in `deliverSchema`.
**Required:** Make it required (no default). Caller must specify.
**Why:** Defaulting the baby's relation silently corrupts records when callers forget to pass it. There is no sane default — gender alone doesn't determine relation_to_head reliably across data entry workflows.

```js
// Before
relation_to_head: z.enum(['son','daughter','other']).default('son'),

// After
relation_to_head: z.enum(['son','daughter','other']),  // required
```

---

## 6. Validation — Indian government ID formats

**Current:**
- `aadhaar: z.string().length(12)` — accepts non-digit strings
- `pincode: z.string().max(10)` — too loose
- `contact_number: z.string().max(15)` — too loose

**Required:** Add digit-only regex constraints.

```js
aadhaar:        z.string().regex(/^\d{12}$/).nullable().optional(),
pincode:        z.string().regex(/^\d{6}$/).optional(),
contact_number: z.string().regex(/^\d{10}$/).nullable().optional(),
```

**Apply everywhere these fields appear** — `createMemberSchema`, `updateMemberSchema`, `createHouseholdSchema`, `updateHouseholdSchema`.

---

## 7. Missing — fuzzy member name search on household list

**Current:** `GET /households` filters only by `malaria_number`, `village`, `status`.
**Required:** Add `?q` query param that does a fuzzy search across `members.full_name` within each household, and returns households containing matching members.
**Why:** This is the most common field workflow — a ground staffer remembers a member's name, not the household's malaria number. The `pg_trgm` extension was installed in migration 1 specifically for this.

**Implementation:**
- Use `members.full_name % $1` (trigram similarity operator) joined to households
- Return households where at least one member matches
- Combine with existing filters (AND logic)

**Schema update:**
```js
searchHouseholdsSchema = searchHouseholdsSchema.extend({
  q: z.string().min(2).max(100).optional(),
})
```

---

## 8. Missing — bulk vaccination administer endpoint

**Current:** `PATCH /vaccinations/:id/administer` only handles one dose at a time.
**Required:** Add `POST /members/:id/vaccinations/batch-administer` that accepts an array and processes in a single Postgres transaction.

**Why:** Field vaccination visits administer 3–4 doses at once (e.g., DPT_1 + OPV_1 + HEP_B_1 + ROTAVIRUS_1). Forcing four sequential PATCH calls over rural 2G connectivity guarantees partial-state corruption when one fails mid-batch.

**Schema:**
```js
batchAdministerSchema = z.object({
  doses: z.array(z.object({
    vaccination_id:    z.string().uuid(),
    administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes:             z.string().optional(),
  })).min(1).max(20),
})
```

**Behavior:**
- All-or-nothing: if any dose fails, none are recorded
- Implement as a Postgres function (RPC) for atomicity, not Express loop
- Returns array of updated vaccination rows
- Audit log entry per dose, all under one batch context

**Role:** `doctor`, `ground_staff`, `admin` (same as single administer).

---

## 9. Error code enum + shared export

**Current:** Error responses have `code` and `message`, but `code` values are ad hoc.
**Required:** Define a fixed enum and export it from `/shared/schemas` so the client can import and switch on it.

**Enum:**
```js
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',  // zod parse failure — show field-level
  NOT_FOUND:        'NOT_FOUND',         // resource doesn't exist
  FORBIDDEN:        'FORBIDDEN',         // role doesn't permit action
  UNAUTHORIZED:     'UNAUTHORIZED',      // no/invalid token
  CONFLICT:         'CONFLICT',          // unique constraint, duplicate head, etc.
  RPC_ERROR:        'RPC_ERROR',         // Postgres function raised
  INTERNAL:         'INTERNAL',          // unexpected — log + generic message
}
```

**Action:**
- Audit every existing error response in the codebase and map it to one of the above
- Reject anything that doesn't fit — either expand the enum (with a CLAUDE.md update) or restructure the error
- Update `errorHandler.js` middleware to enforce this

**Why it matters for React:** The frontend will switch on `code` to decide UX — `VALIDATION_ERROR` highlights specific fields, `CONFLICT` shows a modal, `FORBIDDEN` redirects, etc. Inconsistent codes make this impossible.

---

## 10. (Optional) Pagination TODO

**Current:** `total` uses Supabase `{ count: 'exact' }`.
**Action:** Add a `// TODO:` comment in each list controller noting that exact count becomes expensive past ~10k rows. Switch to estimated count or cursor pagination if any list table grows that large. No code change now.

---

## Verification checklist

After applying all fixes:

- [ ] All 9 mandatory items addressed (#10 is optional)
- [ ] `/shared/schemas/errors.js` exports `ERROR_CODES`
- [ ] New migration file added for the bulk-administer RPC, mirrored to `/supabase/migrations/`
- [ ] Smoke test updated to cover: bulk administer happy path, bulk administer partial-failure rollback, fuzzy household search, role denial on disease-history POST as ground_staff, role denial on pregnancies POST as ground_staff
- [ ] All 14+ smoke checks pass
- [ ] CLAUDE.md §7 matrix matches actual middleware (re-read both side by side)
- [ ] Report back with a diff summary before Phase E starts