# Inward Order Detail and Stage Tracking

## Detail page
- Make each existing Inward Orders card open `/inward-orders/:id` without changing the card’s visual design.
- Add a dedicated detail page with a back action, “Inward Orders” title, and edit/delete icon actions.
- Show the requested fields in the exact order, using stacked blue labels and larger values inside the existing soft-shadow visual system.
- Show Open, In Progress, and Completed as distinct status badges.
- Let Edit open a form for all inward-order fields and status, saving updates to the shared app state and Lovable Cloud.
- Let Delete open a confirmation dialog, remove the order, and return to the Inward Orders grid.

## Progress and stages
- Add a `project_stages` collection linked to each inward order, with stage name, status, assigned person, remarks, expected date, and stable display order.
- Automatically create Design, Fabrication, Material Procurement, Production, Testing, Inspection, and Dispatch records whenever an inward order is created.
- Safely initialize the same seven records for existing orders that do not have them yet, without creating duplicates.
- Calculate progress reactively from current stage records: not started = 0, in progress = 0.5, done = 1, divided by 7.
- Render the percentage, completed-stage count, animated rounded progress bar, and seven connected clickable stage nodes.
- Open a read-only side panel for a selected stage showing its current status, assigned person, remarks, and expected date.

## Attachments
- Add persistent attachment metadata linked to the inward order and a dedicated Lovable Cloud file bucket.
- Support file upload from the detail page and list uploaded filenames with download actions.
- Keep attachments below the progress bar and stage tracker, as requested.

## Data and compatibility
- Add the new stage and attachment structures with grants and access policies matching the app’s current access model.
- Align inward-order status storage with Open, In Progress, and Completed while preserving any existing closed records as completed.
- Update generated database typings used by the app after the schema is applied.

## Validation
- Check direct detail-page loading, card navigation, editing, delete confirmation, stage initialization, weighted progress, stage side panel, upload/download, missing-order handling, and mobile layout.
- Verify route metadata and run project type validation plus focused browser checks.

## Technical details
- Route file: `src/routes/inward-orders.$id.tsx` using TanStack Router typed params and links.
- Stage and attachment operations remain in the existing Zustand/cloud data layer; no changes to Quotations or the conversion dialog UI.
- File objects live in cloud storage; database rows store names, paths, sizes, and timestamps rather than embedding file contents.
