# Proposal Genius

PROJECT OVERVIEW

I want to completely redesign my existing Techno-Commercial Offer Generator.

IMPORTANT:

I already have:

Complete React PDF pages (Page 1 to Page 24)

Existing Puppeteer PDF generation flow

Existing proposal store

Existing export pipeline

Existing engineering content files

Existing Advanced System content

DO NOT redesign the PDF pages.

DO NOT redesign the export flow.

DO NOT redesign Puppeteer generation.

The PDF layout is already approved and must remain exactly as it is.

The goal is ONLY to replace the current "editable proposal" workflow with a structured multi-step form wizard.

CURRENT WORKFLOW (TO REMOVE)

User opens proposal pages.

User edits proposal content directly.

User generates PDF.

NEW WORKFLOW (TO BUILD)

User creates a Project.

User fills a structured form.

System automatically builds proposal data.

Existing PDF pages consume the generated data.

Puppeteer exports PDF exactly as before.

CRITICAL REQUIREMENT

THIS MUST BE A DATA-DRIVEN PROPOSAL ENGINE.

DO NOT hardcode engineering content inside React components.

ALL content must come from dedicated data files.

I will frequently modify:

Engineering descriptions

Scope of supply

Scope of services

Exclusions

Delivery schedules

Payment terms

Technical specifications

Photographs

System descriptions

Therefore every piece of content must be editable through data files.

EXISTING FILES I WILL PROVIDE

PDF page components

Example:

RFQPdf.jsx

Page2.jsx

Page3.jsx

...

Page24.jsx

Existing content files

systemContent.js

technicalPagesData.js

testsData.js

Existing proposal store

proposalStore.js

Existing PDF export flow

Puppeteer implementation

FORM WIZARD

STEP 1

CUSTOMER DETAILS

Fields:

Title

Mr.

Ms.

Mrs.

Contact Person Name

Company Full Name

Company Nickname

STEP 2

PROPOSAL DETAILS

Prepared By

Dropdown from employee master

Checked By

Dropdown from employee master

Offer Number

Auto Generated

Revision

Dropdown

Rev 0 to Rev 10

Date

Auto generated

STEP 3

TRANSFORMER DETAILS

Transformer Rating

Example:

500

Unit

MVA / KVA

Voltage

Example:

765

Voltage Unit

kV

STEP 4

SYSTEM TYPE

Show large cards.

Options:

Advanced

Fully Automatic

Semi Automatic

Conventional

SYSTEM RULES

Advanced

Software = Yes

LV Trolley = Automatic

Fully Automatic

Software = Yes

LV Trolley = Automatic

Semi Automatic

Software = Report Generation Only

LV Trolley = Manual

Conventional

Software = No

LV Trolley = Manual

STEP 5

TEST SELECTION

Display all tests as cards.

Multi-select.

Use testsData.js.

Selected tests must automatically populate:

Statement of Requirement page

Connection page

Scope pages

Technical pages

STEP 6

TESTING INSTRUMENTS

Editable table.

Default values loaded from master data.

Examples:

Power Analyzer

Voltage Ratio Meter

Winding Resistance Meter

Insulation Resistance Meter

Lightning Impulse Tester

Partial Discharge Meter

STEP 7

OTHER EQUIPMENT

Editable table.

Examples:

HT Capacitor Bank

MG Set

CT

PT

HV Transformer

Booster Transformer

Generator Panels

STEP 8

PROPRIETARY ITEMS

Checkbox list.

Advanced Transformer Test Bench

Power Panel

LV Test Trolley

Report Software

Commissioning

Training

Documentation

STEP 9

DELIVERY DETAILS

Location

Documents Schedule

Material Supply Schedule

Packing Schedule

Commissioning Schedule

Training Schedule

STEP 10

PAYMENT TERMS

Editable percentages.

Validation:

Total must always equal 100%.

STEP 11

REVIEW

Show complete proposal summary.

Allow editing before generation.

DATA ARCHITECTURE

Create:

src/data/

employeesData.js

systemTypesData.js

testsData.js

instrumentsData.js

equipmentData.js

deliveryData.js

paymentTermsData.js

scopeOfSupplyData.js

scopeOfServicesData.js

exclusionsData.js

makesOfSupplyData.js

CONTENT STRUCTURE

Create:

src/data/pageContent/

advanced/

fullyAutomatic/

semiAutomatic/

conventional/

Each system type must have separate content files.

IMPORTANT

Currently only ADVANCED has complete engineering content.

I will provide complete Advanced content.

For:

Fully Automatic

Semi Automatic

Conventional

create professional placeholder content.

DO NOT hardcode placeholder content inside components.

Store placeholder content inside data files.

I will replace it later.

MAPPING ENGINE

Create a central configuration file.

Example:

systemConfiguration.js

This file should control:

software inclusion

LV trolley type

content source

default equipment

default instruments

default scope

based on selected system type.

PROJECT MANAGEMENT

User should be able to:

Create Project

Edit Project

Save Project

Duplicate Project

Generate Proposal PDF

Regenerate Proposal PDF later

UI REQUIREMENTS

Modern SaaS Dashboard

Industrial Engineering Theme

Electrosoft Branding

Multi-Step Wizard

Progress Bar

Autosave

Responsive Layout

ShadCN UI

React

Tailwind

Clean White + Blue Theme

FINAL GOAL

Build a reusable Proposal Engine.

Not a hardcoded Techno Commercial Form.

The system must support future proposal types without major code changes.

PDF pages remain unchanged.

Only data collection and data mapping workflow should change.  import { create } from "zustand";

import { devtools } from "zustand/middleware";

import technicalPagesData from "../Data/technicalPagesData";

import commercialPagesData from "../Data/commercialPagesData";

import commercialPages19to24Data from "../Data/commercialPages19to24Data"; // ← ADD THIS IMPORT

/* ─────────────────────────────────────────────────────────────

   HELPERS

───────────────────────────────────────────────────────────── */

export async function fileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}

function hydrateTechnicalPages(systemType) {

  const raw = technicalPagesData?.[systemType] ?? {};

  // Deep-clone so mutations in editable pages don't mutate the static import.

  // NOTE: page13 connection images will be Vite asset URLs at this point.

  // Page13.jsx converts them to base64 data URLs on mount via

  // updateTechnicalPage("page13", ...) so that serialize() captures

  // Puppeteer-compatible image data. Do NOT attempt to store blob URLs here.

  return JSON.parse(JSON.stringify(raw));

}

function hydrateCommercialPages(systemType) {

  // Deep-clone base pages (15–18) from commercialPagesData

  const base = JSON.parse(JSON.stringify(commercialPagesData?.[systemType] ?? {}));

  // Deep-clone extension pages (19–24) from commercialPages19to24Data

  const ext  = JSON.parse(JSON.stringify(commercialPages19to24Data?.[systemType] ?? {}));

  // Merge: ext keys (page19–page24) are added on top of base keys (page15–page18)

  return { ...base, ...ext };

}

/*

 * buildSections()

 *

 * Converts the technicalPages keyed object into a flat array for

 * TechnicalPreview.jsx to iterate with .map().

 *

 * REAL DATA SHAPE (from technicalPagesData.js):

 *   page4: { sections: [ { type, title, description, layout, images }, ... ] }

 *   page12: { title, description, sldPdf, layoutImage, ... }   ← special shape

 *   page13: { title, connections: [...], footerNote }           ← special shape

 *

 * Each entry in the output array:

 *   { pageKey, pageType, data }

 *

 *   pageType: "sections"    → pages 4–11 (array of section blocks)

 *             "schematic"   → page 12

 *             "connections" → page 13

 */

function buildSections(technicalPages) {

  if (!technicalPages || typeof technicalPages !== "object") return [];

  return Object.entries(technicalPages)

    .sort(([a], [b]) => {

      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;

      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;

      return numA - numB;

    })

    .map(([pageKey, pageData]) => {

      // page13: has connections array

      if (Array.isArray(pageData?.connections)) {

        return { pageKey, pageType: "connections", data: pageData };

      }

      // page12: has sldPdf key

      if (pageData?.sldPdf !== undefined) {

        return { pageKey, pageType: "schematic", data: pageData };

      }

      // pages 4–11: have a sections array

      if (Array.isArray(pageData?.sections)) {

        return { pageKey, pageType: "sections", data: pageData };

      }

      // fallback: render raw

      return { pageKey, pageType: "raw", data: pageData };

    });

}

/* ─────────────────────────────────────────────────────────────

   INITIAL STATE

───────────────────────────────────────────────────────────── */

function makeInitialMeta() {

  return {

    systemType: "Advanced",

    transformerRating: "500 MVA",

    voltageClass: "765 kV",

    preparedBy: [],

    proposalDate: "",

    proposalNumber: "",

    revisionNumber: "R0",

    customerRef: "",

  };

}

function makeInitialRfq() {

  return {

    rfqNumber: "",

    rfqDate: "",

    customerName: "",

    customerAddress: "",

    contactPerson: "",

    contactEmail: "",

    contactPhone: "",

    projectTitle: "",

    projectLocation: "",

    deliveryPeriod: "",

  };

}

function makeInitialRfqCover() {

  return {

    title: "Mr.",

    to: "VC Krishna",

    companyName: "M/s Neotrafo Solutions India Private Limited",

    reference: "",

    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),

    preparedBy: "J.M. Krishna",

    checkedBy: "Sabir Baig",

    revision: "Rev. 0",

    revisionDate: new Date().toLocaleDateString("en-GB"),

    address: "S7-1&2, Jai Matadi Compound, Thane-Bhiwandi Road,\nKalher, Thane District, Maharashtra, India – 421302\nTel. No. +91 8692 888 444",

  };

}

function makeInitialRequirement() {

  return {

    tests: [],

    additionalNotes: "",

    trolleyType: "Automatic",

  };

}

function makeInitialSystemOverview() {

  return {

    heading: "",

    tagline: "",

    intro: "",

    project: "",

    description: "",

    highlights: [],

  };

}

/* ─────────────────────────────────────────────────────────────

   STORE

───────────────────────────────────────────────────────────── */

export const useProposalStore = create(

  devtools(

    (set, get) => ({

      /* =====================================================

         BACKWARD COMPATIBILITY

      ===================================================== */

      proposal: {

        systemType: "Advanced",

        transformerRating: "500 MVA",

        voltageClass: "765 kV",

      },

      updateProposal: (patch) =>

        set((s) => ({

          proposal: { ...s.proposal, ...patch },

          meta: { ...s.meta, ...patch },

        })),

      /* =====================================================

         META

      ===================================================== */

      meta: makeInitialMeta(),

      updateMeta: (patch) =>

        set((s) => ({ meta: { ...s.meta, ...patch } })),

      setSystemType: (systemType) =>

        set((s) => {

          if (s.meta.systemType === systemType) return {};

          const technicalPages = hydrateTechnicalPages(systemType);

          const commercialPages = hydrateCommercialPages(systemType); // ← now includes pages 19–24

          return {

            proposal: {

              ...s.proposal,

              systemType,

            },

            meta: {

              ...s.meta,

              systemType,

            },

            technicalPages,

            commercialPages,

          };

        }),

      /* =====================================================

         COVER

      ===================================================== */

      cover: {

        companyName: "Electrosoft Automation Private Limited",

        logoBase64: null,

        tagline: "Transforming Transformer Testing",

      },

      updateCover: (patch) =>

        set((s) => ({ cover: { ...s.cover, ...patch } })),

      setCoverLogo: async (file) => {

        const base64 = await fileToBase64(file);

        set((s) => ({ cover: { ...s.cover, logoBase64: base64 } }));

      },

      /* =====================================================

         RFQ COVER

      ===================================================== */

      rfqCover: makeInitialRfqCover(),

      updateRfqCover: (patch) =>

        set((s) => ({ rfqCover: { ...s.rfqCover, ...patch } })),

      /* =====================================================

         RFQ

      ===================================================== */

      rfq: makeInitialRfq(),

      updateRfq: (patch) =>

        set((s) => ({ rfq: { ...s.rfq, ...patch } })),

      /* =====================================================

         REQUIREMENT

      ===================================================== */

      requirement: makeInitialRequirement(),

      updateRequirement: (patch) =>

        set((s) => ({ requirement: { ...s.requirement, ...patch } })),

      setRequirementTests: (tests) =>

        set((s) => ({ requirement: { ...s.requirement, tests } })),

      /* =====================================================

         SYSTEM OVERVIEW

      ===================================================== */

      systemOverview: makeInitialSystemOverview(),

      updateSystemOverview: (patch) =>

        set((s) => ({ systemOverview: { ...s.systemOverview, ...patch } })),

      /* =====================================================

         TECHNICAL PAGES

         ─────────────────────────────────────────────────────

         updateTechnicalPage replaces the entire page entry with

         a shallow merge. For page13 this means the full

         { title, connections, footerNote } object is replaced.

         Editable pages (e.g. Page13.jsx) call this after every

         mutation so that serialize() always captures the latest

         live state, including base64 image data URLs.

      ===================================================== */

      technicalPages: hydrateTechnicalPages("Advanced"),

      // commercialPages now includes pages 15–18 (base) + 19–24 (ext) merged

      commercialPages: hydrateCommercialPages("Advanced"),

      updateTechnicalPage: (pageKey, patch) =>

        set((s) => ({

          technicalPages: {

            ...s.technicalPages,

            [pageKey]: { ...s.technicalPages[pageKey], ...patch },

          },

        })),

      updateCommercialPage: (pageKey, patch) =>

        set((s) => ({

          commercialPages: {

            ...s.commercialPages,

            [pageKey]: {

              ...s.commercialPages[pageKey],

              ...patch,

            },

          },

        })),

      /* =====================================================

         EXPORT STATUS

      ===================================================== */

      exportStatus: {

        technical: "idle",

        commercial: "idle",

        full: "idle",

      },

      setExportStatus: (type, status) =>

        set((s) => ({ exportStatus: { ...s.exportStatus, [type]: status } })),

      /* =====================================================

         RESET

      ===================================================== */

      resetProposal: () =>

        set({

          proposal: {

            systemType: "Advanced",

            transformerRating: "500 MVA",

            voltageClass: "765 kV",

          },

          meta: makeInitialMeta(),

          rfq: makeInitialRfq(),

          rfqCover: makeInitialRfqCover(),

          requirement: makeInitialRequirement(),

          systemOverview: makeInitialSystemOverview(),

          technicalPages: hydrateTechnicalPages("Advanced"),

          commercialPages: hydrateCommercialPages("Advanced"), // ← includes 19–24

          exportStatus: {

            technical: "idle",

            commercial: "idle",

            full: "idle",

          },

        }),

      /* =====================================================

         SERIALIZE

         ─────────────────────────────────────────────────────

         Captures the full current state into a plain JSON-safe

         object that is POSTed to the Express backend.

         The backend injects this into Puppeteer via

         page.evaluate() before the print route renders.

         IMPORTANT: technicalPages.page13.connections[*].image

         must be base64 data URLs at this point, not blob/object

         URLs. Page13.jsx ensures this by converting all images

         to base64 before calling updateTechnicalPage.

      ===================================================== */

      serialize: () => {

        const s = get();

        return {

          proposal: s.proposal,

          meta: s.meta,

          cover: s.cover,

          rfq: s.rfq,

          rfqCover: s.rfqCover,

          requirement: s.requirement,

          systemOverview: s.systemOverview,

          technicalPages: s.technicalPages,

          commercialPages: s.commercialPages, // ← pages 19–24 now included

          sections: buildSections(s.technicalPages),

        };

      },

      /* =====================================================

         HYDRATE

         Called by the backend-injected script on the print

         route to pre-populate Zustand before React renders.

      ===================================================== */

      hydrate: (savedData) =>

        set({

          proposal: {

            systemType: savedData?.meta?.systemType ?? "Advanced",

            transformerRating: savedData?.meta?.transformerRating ?? "500 MVA",

            voltageClass: savedData?.meta?.voltageClass ?? "765 kV",

          },

          meta: savedData?.meta ?? makeInitialMeta(),

          cover: savedData?.cover ?? {},

          rfq: savedData?.rfq ?? makeInitialRfq(),

          rfqCover: savedData?.rfqCover ?? makeInitialRfqCover(),

          requirement: savedData?.requirement ?? makeInitialRequirement(),

          systemOverview: savedData?.systemOverview ?? makeInitialSystemOverview(),

          technicalPages:

            savedData?.technicalPages ??

            hydrateTechnicalPages(savedData?.meta?.systemType ?? "Advanced"),

          commercialPages:

            savedData?.commercialPages ??

            hydrateCommercialPages(savedData?.meta?.systemType ?? "Advanced"), // ← includes 19–24

        }),

    }),

    { name: "ProposalStore" }

  )

);  import React from "react";

import PdfHeader from "./components/PdfHeader";

import PdfFooter from "./components/PdfFooter";

import { useProposalStore } from "../store/proposalStore";

/*

 * RFQPdf — Cover Page (Page 1 of 24)

 *

 * FORENSIC MEASUREMENTS (target PDF, PyMuPDF):

 *   Page is 595.3×841.9pt (A4 = 210×297mm)

 *   Header: logo left, "Techno-commercial / Proposal" right — handled by PdfHeader

 *   Content starts at y=93.7pt = 33.1mm (same as inner pages)

 *

 *   TABLE 1 (To / Name / Subject / Reference / Date):

 *     "To" y=109.9pt = 38.8mm,  left col x=101.3pt, right col x=237pt

 *     Rows: To, Name of the company, Subject, Our reference, Date

 *     Row height: ~19pt = 6.7mm per row

 *

 *   TABLE 2 (Prepared by / Checked by / Revision / Contact):

 *     "Prepared by" y=251.3pt = 88.7mm

 *     Rows: Prepared by, Checked by, Revision no. & date, Contact Address

 *

 *   Gap between tables: ~250 - 204 ≈ 46pt = 16mm

 *

 *   "Dear Sir," y=415.6pt = 146.7mm

 *   Body paragraphs: 3 paragraphs of SegoeUI 10.08pt text

 *

 *   "Sincerely," y=628pt = 221.7mm

 *   Signature block (left) + red confidentiality box (right)

 *

 *   Footer: 3-line italic at y=730.9pt = 257.9mm (handled by PdfFooter)

 *

 * TWO SEPARATE TABLES — not merged. Table 1 has full-width borders.

 * Table 2 also has full-width borders.

 * Labels in BOLD (SegoeUI-Bold), values in regular/italic SegoeUI.

 * No alternating row colors — clean white background.

 */

export default function RFQPdf() {

  const rfqCover = useProposalStore((state) => state.rfqCover);

  const meta = useProposalStore((state) => state.meta);

  const to = `${rfqCover?.title ? rfqCover.title + " " : ""}${rfqCover?.to || "VC Krishna"}`;

  const companyName = rfqCover?.companyName || "M/s Neotrafo Solutions India Private Limited";

  const subject = `Techno-commercial offer for ${meta?.transformerRating || "500 MVA"}, ${meta?.voltageClass || "765kV"} Transformer Testing System - ${meta?.systemType || "Advanced"}`;

  const reference = rfqCover?.reference || "Q001/2025-26/Neo/TTS/R0";

  const date = rfqCover?.date || "24th November 2025";

  const preparedBy = rfqCover?.preparedBy || "J.M. Krishna";

  const checkedBy = rfqCover?.checkedBy || "Sabir Baig";

  const revision = rfqCover?.revision || "Rev. 0";

  const revisionDate = rfqCover?.revisionDate || "24.11.2025";

  const contactAddress = rfqCover?.address || "Electrosoft Automation Pvt. Ltd.,\nS7-1&2, Jai Matadi Compound, Thane-Bhiwandi Road,\nKalher, Thane District, Maharashtra, India – 421302\nTel. No. +91 8692 888 444"side a light gray shaded background bar (like a section header)

 *   • Intro paragraph — SegoeUI 10.08pt, starts at y=125.9pt=44.5mm

 *   • Test list — SINGLE COLUMN, numbered 1–18, each ~19pt row height

 *     Font: SegoeUI 10.08pt, color #0f172a

 *     Item 4 spans 2 lines

 *     Items start at y=190pt=67mm

 *   • "Note: Impulse generator..." — SegoeUI-Bold 10.08pt, y=542.5pt=191.5mm

 *     Indented, bold

 *   • "Proposed solution:" — SegoeUI-BoldItalic 11.04pt, y=586pt=206.7mm

 *     Same shaded gray bar style as the title

 *   • Solution paragraph — SegoeUI 10.08pt, y=618pt=218.2mm

 *

 * KEY DIFFERENCES FROM OLD CODE:

 *   1. Single column (NOT 2-column grid) for the test list

 *   2. Section headers ("Statement of Requirements:" and "Proposed solution:")

 *      use a shaded gray background bar — NOT just a colored heading

 *   3. No blue left-border box for the note/solution section

 *   4. Note is just a bold indented paragraph

 *   5. No blue numbered items — plain black text with number prefix

 *   6. Font size closer to 9.5px (10.08pt × 96/72 = 13.4px... but visually

 *      in PDF it looks about 9.5-10px CSS due to PDF point rendering)

 */

export default function RequirementPdf() {

  const requirement = useProposalStore((state) => state.requirement);

  const meta = useProposalStore((state) => state.meta);

  const rfqCover = useProposalStore((state) => state.rfqCover);

  const fallbackTests = [

    "Measurement of winding resistance at all taps",

    "Measurement of voltage ratio at all taps",

    "Check of phase displacement and vector group",

    "Measurement of no-load loss and no-load current at 90%, 100% & 110% of rated voltage & frequency",

    "Magnetic balance test and measurement of magnetizing current",

    "Short-circuit impedance and load-loss measurement at principal tap and extreme taps",

    "Measurement of insulation resistance & Polarization Index (PI)",

    "Applied Voltage Test (AV)",

    "Induced Voltage Withstand Test (IVW)",

    "On-load tap changer (OLTC) testing with tap-changer fully assembled on transformer",

    "Core and frame insulation check",

    "Leak testing with pressure for liquid-immersed transformers (tightness test)",

    <>Measurement of no-load current and short-circuit impedance using <strong>415 V, 50 Hz</strong> AC supply</>,

    "Temperature rise test",

    "Full Wave Lightning Impulse Test (LI) for line terminals",

    "Measurement of zero-sequence reactance",

    "Measurement of harmonic levels in no-load current",

    "Induced voltage test with Partial Discharge measurement (IVPD)",

 

}You're right. Looking at the screenshots and the sample PDF pages, the current wizard is only collecting about 30-40% of the data needed to generate a proper 24-page techno-commercial proposal.

The biggest issue is that Loveable built a data entry form, but your PDF is actually a proposal generation engine.

The PDF pages you showed contain:

Customer details

Contact details

Mobile number

Email

Offer metadata

Transformer details

System type details

Test selection

Major subsystem descriptions

Images for each subsystem

Instrument specifications

Equipment specifications

Proprietary items

Scope of supply

Scope of services

Delivery schedules

Payment terms

Makes of supply

Exclusions

Technical specifications

Connection descriptions

Statement of requirement

Engineering content

Page-specific images

Most of that data currently has no source in the wizard, meaning the PDF is being generated mostly from hardcoded files.

PROMPT FOR LOVEABLE

Paste this entire thing.

I have reviewed the generated wizard.

The current implementation is NOT sufficient to generate my complete 24-page techno-commercial proposal.

The current wizard collects only a small subset of the required data.

I need the wizard to become a COMPLETE proposal-generation engine capable of producing every section of the proposal PDF.

DO NOT MODIFY:

Existing PDF pages

Existing Puppeteer export

Existing page layouts

Only improve the proposal data collection architecture.

1. MERGE FIRST 4 STEPS

Combine these steps into ONE page:

Customer Details

Proposal Details

Transformer Details

System Type

This should be a single form page.

Additional fields required:

Contact Person

Designation

Mobile Number

Alternate Mobile

Email

Company Full Name

Company Short Name

Company Address

City

State

Country

GST Number

Prepared By

Checked By

Offer Number

Revision

Date

Transformer Rating

Transformer Unit

Voltage Class

Voltage Unit

System Type

Advanced

Fully Automatic

Semi Automatic

Conventional

2. REMOVE REMARKS FROM INSTRUMENTS

Current structure:

Instrument

Make

Model

Qty

Remarks

Remove Remarks.

Replace with:

Instrument

Make

Model

Spec-1

Spec-2

Spec-3

Spec-4

Spec-5

Quantity

Price

This must match the proposal tables.

3. REBUILD EQUIPMENT SECTION

Current equipment page is wrong.

Equipment should match proposal format.

Use structure:

Equipment

Yes/No

Spec-1

Spec-2

Spec-3

Spec-4

Spec-5

Quantity

Price

Examples:

HT Capacitor Bank

MG Set

CT-1

CT-2

CT-3

PT-1

PT-2

MG Set for IOVT

HV Transformer

Independent Dimmer

Booster Transformer

Generator Control Panels

LT Capacitor Bank

CT/PT Rack

etc.

Exactly like proposal tables.

Allow:

Add Equipment

Remove Equipment

Edit Equipment

4. ADD NEW STEP

Major Sub Systems

Place this AFTER Test Selection.

New order:

Page 1

Customer + Proposal + Transformer + System

Page 2

Tests

Page 3

Major Sub Systems

Page 4

Instruments + Equipment

Page 5

Proprietary Items

Page 6

Delivery

Page 7

Exclusions + Makes Of Supply

Page 8

Payment

Page 9

Review

5. MAJOR SUB SYSTEMS

This is critical.

For each system type:

Advanced

Fully Automatic

Semi Automatic

Conventional

I have predefined subsystem content.

Examples:

Control Desk

Power Panel

SCADA System

PLC System

HV Switching

CT/PT Rack

LV Test Trolley

Safety System

Busbar System

Cable Management

Report Generation Software

etc.

User should only see:

Checkbox

Heading

Small Preview

NOT full description.

Full description remains hidden.

When PDF exports:

Selected subsystem automatically inserts:

Heading

Description

Image

into proposal pages.

6. CREATE SETTINGS MODULE

Outside Project Wizard create:

Settings

Inside Settings create:

Major Sub Systems

This should act as CMS.

For each subsystem store:

Title

Description

Image

System Type

Advanced

Fully Automatic

Semi Automatic

Conventional

User can:

Upload Image

Replace Image

Edit Description

Save

Future proposals should use latest saved content.

7. CREATE CONTENT MANAGEMENT

Create Settings modules for:

Major Sub Systems

Scope Of Supply

Scope Of Services

Exclusions

Makes Of Supply

Delivery Templates

Payment Templates

Instrument Library

Equipment Library

Test Library

Employee Master

All content must be editable.

No hardcoding.

8. DELIVERY PAGE REDESIGN

Current page is insufficient.

Use rows:

Deliverable Documents

Supply Of Material

Packing Forwarding & Transit

Erection

Supervision Of Installation

Commissioning

Training

Each row should have dropdown.

Options:

1-2 Weeks

3-4 Weeks

5-6 Weeks

7-8 Weeks

9-10 Weeks

11-12 Weeks

13-14 Weeks

15-16 Weeks

17-18 Weeks

19-20 Weeks

Will Be Decided Later

Custom

If Custom selected:

show textbox.

Allow Add Row.

Allow Remove Row.

9. EXCLUSIONS PAGE

Create dedicated page.

Show exclusions as checkbox list.

Example:

All interconnection cables

Civil works

Foundation work

Fence and gates

Ventilation system

Lighting system

Field junction boxes

Panel AC

Receipt unloading

Storage at site

Power cable laying

etc.

Allow:

Add

Edit

Delete

Checkbox selection

Selected exclusions populate proposal automatically.

10. MAKES OF SUPPLY PAGE

Create dedicated page.

Use checkbox + dropdown.

Examples:

Switchgear & VFD

Test Bench

Power Panel

Capacitor Panel

Enclosure

Software

PLC

CT/PT

Dimmer

Transformer

MG Set

User can:

Enable row

Choose manufacturer

Dropdown examples:

ABB

Siemens

Schneider

Electrosoft

Delta

Moonlight

Customer Specified

Custom Entry

Selected values automatically populate proposal page.

11. PAYMENT PAGE

Keep current layout.

Add:

Save as template.

Load template.

Default templates:

20-10-60-10

30-20-40-10

Custom

12. PROJECT DASHBOARD

Home Page should show:

Create Project

Draft Projects

Completed Projects

Archived Projects

Duplicate Project

Delete Project

Generate PDF

Download PDF

13. CONTENT STORAGE RULE

No descriptions should live inside React components.

All proposal content must be stored in:

/data

or database

including:

Subsystem descriptions

Images

Scope Of Supply

Scope Of Services

Exclusions

Makes Of Supply

Delivery templates

Payment templates

Instrument specifications

Equipment specifications

Everything must be data-driven.

FINAL OBJECTIVE

The wizard must collect enough information to generate 100% of the techno-commercial proposal PDF without relying on hidden hardcoded content.

The proposal engine should function like a CMS-driven proposal builder where all future content, images and specifications can be managed from Settings without modifying code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gena-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d0fe0917-5329-460d-b54b-4003cee47ba9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
