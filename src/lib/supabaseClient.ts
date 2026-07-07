import { createClient } from "@supabase/supabase-js";

// Publishable key + URL — safe to ship in the browser bundle.
const SUPABASE_URL = "https://cxvdlpnmzgbunukcsynr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rWicahob0oBLRGxalCOVmg_moNppUG5";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
