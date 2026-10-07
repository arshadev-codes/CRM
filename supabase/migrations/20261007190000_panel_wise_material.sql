-- Panel-wise material: each procurement item can belong to a panel of the order (from the
-- cost sheet), and each production panel has the people assigned to it (employee ids), so a
-- person can later be shown only the material of their own panels.
ALTER TABLE public.procurement_items
  ADD COLUMN panel text NOT NULL DEFAULT '',
  ADD COLUMN panel_id uuid REFERENCES public.production_panels(id) ON DELETE SET NULL,
  ADD COLUMN consumable boolean NOT NULL DEFAULT false;
CREATE INDEX procurement_items_panel_idx ON public.procurement_items (inward_order_id, panel_id);

ALTER TABLE public.production_panels
  ADD COLUMN assignee_ids text[] NOT NULL DEFAULT '{}';
