# Electrosoft CRM

Internal web app for Electrosoft: techno-commercial quotations, enquiries, inward
orders and their production stages, inventory, employees and attendance.

## Main areas

- **Quotations** – step-by-step wizard that builds the techno-commercial offer PDF.
  All offer content (sub systems, makes, scope, exclusions, payment terms, templates)
  is managed from **Settings**.
- **Enquiries / RFQ** – client requirement form and enquiries inbox.
- **Inward orders** – orders from quotations or created directly, tracked stage by stage
  (procurement, fabrication, production, QA, PDI, dispatch).
- **Employees** – work, ratings, attendance; employee app at `/my`.
- **Admin** – users, permissions and activity log.

## Tech

React + TanStack Start, Tailwind, Supabase (database, auth, edge functions),
deployed on Cloudflare Workers.

## Development

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Other scripts:

```sh
npm run build    # production build
npm run lint
npm run deploy   # build and deploy to Cloudflare
```

## Database

- Migrations live in `supabase/migrations/` and are applied with `npx supabase db push`.
- Edge functions live in `supabase/functions/` and deploy with
  `npx supabase functions deploy <name>`.
- Secrets are set with `npx supabase secrets set` and are never committed.
