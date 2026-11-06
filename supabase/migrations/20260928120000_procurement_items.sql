-- Material Procurement: one row per required material for an inward order.
-- qty_in_stock stays NULL until the store team has checked the item.
CREATE TABLE public.procurement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  specification text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'Nos',
  qty_required numeric NOT NULL DEFAULT 1 CHECK (qty_required >= 0),
  qty_in_stock numeric CHECK (qty_in_stock IS NULL OR qty_in_stock >= 0),
  stock_checked_by text NOT NULL DEFAULT '',
  stock_checked_at timestamptz,
  supplier text NOT NULL DEFAULT '',
  enquiry_date date,
  expected_date date,
  qty_received numeric NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  received_at timestamptz,
  notes text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX procurement_items_order_idx ON public.procurement_items (inward_order_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_items TO authenticated;
GRANT ALL ON public.procurement_items TO service_role;
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.procurement_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_procurement_item_updated_at
BEFORE UPDATE ON public.procurement_items
FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

-- Inventory (beta): a shared stock list. Procurement only uses it to suggest
-- stock numbers; the store team's own check stays the source of truth.
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'Nos',
  qty_in_stock numeric NOT NULL DEFAULT 0 CHECK (qty_in_stock >= 0),
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_inventory_item_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

-- Live updates on the procurement page.
ALTER TABLE public.procurement_items REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
