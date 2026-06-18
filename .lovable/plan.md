# Proposal Engine — Build Plan

A data-driven techno-commercial proposal builder. Wizard collects structured data, data layer feeds 24 PDF pages, Puppeteer-ready print route exports. All content editable via Settings (CMS), nothing hardcoded in components.

## Scope split (important)

This is a very large build. I'll deliver it in **two phases** in this turn:

**Phase 1 (this turn) — full app skeleton + working data flow end-to-end:**
- Project dashboard (create / edit / duplicate / delete / archive, localStorage)
- Full multi-step wizard, all 9 steps from your revised flow
- Complete data architecture under `src/data/` and `src/data/pageContent/{advanced,fullyAutomatic,semiAutomatic,conventional}/`
- Zustand proposal store matching your existing shape (`meta`, `rfqCover`, `requirement`, `technicalPages`, `commercialPages`, `serialize()`, `hydrate()`)
- Settings CMS for: Major Sub Systems, Scope of Supply, Scope of Services, Exclusions, Makes of Supply, Delivery Templates, Payment Templates, Instrument Library, Equipment Library, Test Library, Employee Master
- Print route `/print/:projectId` that renders all PDF pages, ready for Puppeteer
- **PDF pages: 3 fully built reference pages (RFQ cover p1, Statement of Requirement, Scope of Supply) + 21 structured placeholder pages** that consume the data correctly. Layout matches A4 forensic measurements from your snippets. Replacing a placeholder with your real layout later = drop-in, no data wiring needed.

**Phase 2 (you ask, next turn) — fill in remaining 21 PDF pages** with the exact layouts from your sample PDF/XLSX. I'll do these in batches once Phase 1 is approved, because each page needs forensic measurement work.

## Routes

```
/                              Project dashboard
/projects/new                  Create + go to wizard
/projects/:id/wizard           Multi-step wizard (steps 1–9)
/projects/:id/wizard/:step     Direct step access
/projects/:id/preview          On-screen preview of all 24 pages
/print/:id                     Puppeteer entry (no chrome, hydrates from localStorage or ?data=)
/settings                      Settings home
/settings/subsystems           CMS: major sub systems (per system type)
/settings/scope-supply
/settings/scope-services
/settings/exclusions
/settings/makes
/settings/delivery
/settings/payment
/settings/instruments
/settings/equipment
/settings/tests
/settings/employees
```

## Wizard (revised flow you specified)

1. **Project Setup** (merged) — Customer + Proposal + Transformer + System Type
   - Customer: title, contact person, designation, mobile, alt mobile, email, company full name, short name, address, city, state, country, GST
   - Proposal: prepared by (employee dropdown), checked by (employee dropdown), offer number (auto), revision (R0–R10), date (auto)
   - Transformer: rating + unit (MVA/KVA), voltage + unit (kV)
   - System Type: 4 large cards (Advanced / Fully Automatic / Semi Automatic / Conventional)
2. **Tests** — multi-select cards from test library
3. **Major Sub Systems** — checkbox list (title + small preview only); descriptions/images pulled from CMS at PDF time
4. **Instruments + Equipment** — two editable tables on one step
   - Instruments cols: Instrument, Make, Model, Spec-1..5, Qty, Price
   - Equipment cols: Equipment, Yes/No, Spec-1..5, Qty, Price
5. **Proprietary Items** — checkbox list
6. **Delivery** — rows of (Deliverable, Duration dropdown 1–2…19–20 weeks / TBD / Custom)
7. **Exclusions + Makes of Supply** — two sections
   - Exclusions: checkbox list from CMS
   - Makes: per-row enable + manufacturer dropdown (ABB, Siemens, Schneider, Electrosoft, Delta, Moonlight, Customer Specified, Custom)
8. **Payment** — editable % rows, must sum to 100; Save as Template / Load Template; defaults 20-10-60-10, 30-20-40-10
9. **Review** — summary + Generate PDF / Save Draft

Progress bar across top, autosave to localStorage on every change, "Save & Exit" returns to dashboard.

## System type → content mapping

`src/data/systemConfiguration.js` controls per-system-type defaults:

```js
{
  Advanced:        { software: 'Yes', lvTrolley: 'Automatic',          contentDir: 'advanced',        defaultTests: [...], defaultInstruments: [...], defaultEquipment: [...], defaultSubsystems: [...] },
  FullyAutomatic:  { software: 'Yes', lvTrolley: 'Automatic',          contentDir: 'fullyAutomatic',  ... },
  SemiAutomatic:   { software: 'Report Generation Only', lvTrolley: 'Manual', contentDir: 'semiAutomatic', ... },
  Conventional:    { software: 'No',  lvTrolley: 'Manual',             contentDir: 'conventional',    ... },
}
```

Wizard reads this on system-type change to pre-fill defaults. PDF pages read it to resolve software/trolley language and pull content from the right `pageContent/<dir>/` files.

## Data architecture

```
src/data/
  employeesData.js          # employee master
  systemTypesData.js        # 4 system types metadata
  systemConfiguration.js    # mapping engine
  testsData.js              # full test library (id, title, description, group)
  instrumentsData.js        # default instrument library
  equipmentData.js          # default equipment library
  subsystemsData.js         # major subsystems library (title, preview, full description, image, systemType)
  scopeOfSupplyData.js
  scopeOfServicesData.js
  exclusionsData.js
  makesOfSupplyData.js      # rows + manufacturer options
  deliveryData.js           # default deliverable rows + duration options
  paymentTermsData.js       # default templates
  proprietaryItemsData.js
  pageContent/
    advanced/page4.js ... page24.js     # one file per page
    fullyAutomatic/                     # professional placeholder content
    semiAutomatic/
    conventional/
```

Every file is a plain JS module exporting structured data. Editing a file = changing proposal content. CMS pages in Settings write to localStorage overrides keyed by the same IDs; PDF renderer merges (overrides > data file).

## Store

Zustand store mirroring the shape you pasted. Adds:
- `projects[]` (dashboard list) — id, name, status, created, updated, snapshot of all wizard data
- `currentProjectId`
- `loadProject(id)` / `saveProject()` / `duplicateProject(id)` / `deleteProject(id)`
- `cmsOverrides` (settings edits)
- `serialize()` returns the same shape your existing Puppeteer flow expects, so wiring your real PDF pages later is a no-op

Persistence: zustand `persist` middleware → localStorage. Images stored as base64 data URLs (Page13 pattern from your snippet).

## PDF pages (in this phase)

- Print route renders pages back-to-back in A4 frames (`width: 210mm; height: 297mm`) so Puppeteer `printToPDF` gives identical output.
- Shared `PdfHeader` / `PdfFooter` components.
- **Fully built (3):** RFQPdf (p1), RequirementPdf (Statement of Requirement, p3), ScopeOfSupplyPdf — these use the exact forensic measurements from your snippets.
- **Structured stubs (21):** correct A4 frame, header/footer, page title, and the right data bound from the store. Body uses a clean placeholder block. When you give me the real layouts in Phase 2, I swap the body — store wiring already works.

## UI

ShadCN + Tailwind, clean white + blue theme (Electrosoft branding). Industrial SaaS feel — sidebar nav (Dashboard / Projects / Settings), top progress bar in wizard, autosave indicator. Responsive but optimized for desktop (this is a back-office tool).

## What I'm NOT doing in Phase 1

- Lovable Cloud / multi-user / auth (you chose localStorage)
- Actual Puppeteer server (you have your own)
- Recreating the remaining 21 PDF pages pixel-for-pixel — those land in Phase 2

## Confirm to proceed

If this scope is right, I'll start building Phase 1. If you'd rather I build fewer PDF pages and spend more time polishing the wizard CMS, or vice versa, tell me now.
