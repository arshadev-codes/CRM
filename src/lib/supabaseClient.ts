import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as cloud } from "@/integrations/supabase/client";

// Quotations (the "projects" table) use the same database as the rest of the app.
export const supabase = cloud as unknown as SupabaseClient;

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  offer_base: string | null;
  offer_seq: number | null;
  fy: string | null;
  company_short: string | null;
  revision: number;
  parent_id: string | null;
  data: unknown;
  created_at?: string;
  updated_at?: string;
}
