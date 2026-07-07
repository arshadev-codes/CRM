## Scope

Three deliverables:
1. Wire the app to **your external Supabase** for project persistence (keys you shared).
2. **Auto-generate offer numbers** as `Q{NNN}/{FY}/{CompanyShort}/TTS/R{n}`.
3. **Revise Offer** button on completed projects → duplicates as next revision.

---

## 1. Supabase connection

- URL `https://cxvdlpnmzgbunukcsynr.supabase.co` and the publishable key `sb_publishable_...` → stored as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (safe, publishable).
- Service secret `sb_secret_...` → stored via `set_secret` as `SUPABASE_SERVICE_ROLE_KEY` (never shipped to browser).
- New file `src/lib/supabaseClient.ts` — plain browser client with the publishable key.
- Extend the Zustand store to **mirror project writes to Supabase** (`projects` table) with an `upsert` on save, and hydrate `projects` from Supabase on app boot (fallback to local cache if offline).

Persisting the full nested `ProposalData` as JSONB keeps the schema tiny and avoids rewriting every wizard step.

### SQL you run in your Supabase SQL editor

I'll write this to `supabase-schema.sql` in the repo for you to copy:

```sql
create table public.projects (
  id uuid primary key,
  name text not null,
  status text not null default 'Draft',
  offer_base text,         -- "Q001/2025-26/Neo/TTS"
  offer_seq int,           -- 1  (used for auto-increment)
  fy text,                 -- "2025-26"
  company_short text,      -- "Neo"
  revision int not null default 0,
  parent_id uuid references public.projects(id),  -- set on revisions
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index projects_offer_seq_idx on public.projects(fy, offer_seq);

grant select, insert, update, delete on public.projects to anon;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "public rw" on public.projects for all using (true) with check (true);
```

(Open policy — matches your current no-auth setup. Tighten later when you add login.)

---

## 2. Offer number generation

Format: `Q{seq3}/{FY}/{CompanyShort}/TTS/R{rev}`

- `seq3` — next global sequence, zero-padded 3 digits. Computed as `max(offer_seq) + 1` across all projects in the current FY (queried from Supabase, falls back to local store).
- `FY` — Indian fiscal year from project `date` (Apr–Mar), e.g. `2025-26`.
- `CompanyShort` — from `customer.companyShortName`; auto-slug (spaces stripped, capitalize first letter, e.g. `Neo`). Fallback `XXX` if empty.
- `TTS` — fixed literal.
- `R{rev}` — starts `R0`, incremented on Revise.

Wired in `src/store/proposalStore.ts` so `meta.offerNumber` is rebuilt when company name changes or on project creation.

---

## 3. Revise Offer flow

- Dashboard (`src/routes/index.tsx`) project card: when `status === "Completed"`, show a **Revise Offer** button.
- Handler calls a new store action `reviseProject(id)`:
  - Deep-clones the project.
  - New `id`, `parent_id = original.id`, `revision = original.revision + 1`, `status = "Draft"`.
  - Keeps same `offer_base` / `offer_seq` / `FY` / `company_short` — only `R{n}` changes.
  - Rebuilds `meta.offerNumber` and `meta.revision = "R{n}"`.
  - Persists to Supabase + opens the wizard.
- Also surfaced on the project preview/wizard header ("Revise" button visible when completed).

---

## Files touched

**New**
- `supabase-schema.sql` — the SQL block above
- `src/lib/supabaseClient.ts` — browser Supabase client
- `src/lib/offerNumber.ts` — pure helpers (`buildOfferNumber`, `nextOfferSeq`, `getFY`, `slugCompany`)

**Edited**
- `src/store/proposalStore.ts` — Supabase sync, `reviseProject`, offer-number wiring on create/company change
- `src/routes/index.tsx` — Revise Offer button on completed cards
- `src/routes/projects.$id.wizard.tsx` — Revise button in header when completed
- `.env` handling via `set_secret` for the service key

**Not touched**
- All PDF pages, wizard steps, and neomorphic UI stay as-is.

---

## After you approve

I'll implement in one pass and then hand you the SQL to paste into your Supabase SQL editor.
