import { supabase } from "@/lib/supabaseClient";
import type { LibraryOverride } from "@/data/libraries";

// Quotation settings saved "globally" (table shared_settings): every user sees
// them. A row holds a new item, an edited copy of a built-in one (same id), or
// marks a built-in one as removed for everyone. Settings that are one value as a
// whole (delivery durations, connections mapping) use item_id VALUE_ID.

const TABLE = "shared_settings";
export const VALUE_ID = "__value__";

/** cmsOverrides key that holds the global copy of a setting. Never kept in the browser. */
export const SHARED_CMS_PREFIX = "shared:";
export const sharedKey = (key: string) => `${SHARED_CMS_PREFIX}${key}`;

interface Row {
  setting_key: string;
  item_id: string;
  item: unknown;
  deleted: boolean;
}

/**
 * Every global setting, keyed by its cmsOverrides key: a LibraryOverride for
 * lists, the plain value for one-value settings. Null when it can't be read.
 */
export async function fetchSharedSettings(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from(TABLE).select("setting_key,item_id,item,deleted");
  if (error) {
    console.warn("[supabase] shared settings:", error.message);
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const r of (data ?? []) as Row[]) {
    if (r.item_id === VALUE_ID) {
      if (!r.deleted) out[r.setting_key] = r.item;
      continue;
    }
    const ov = ((out[r.setting_key] as LibraryOverride<{ id: string }> | undefined) ??= { items: [], deleted: [] });
    if (r.deleted || !r.item) ov.deleted.push(r.item_id);
    else ov.items.push({ ...(r.item as object), id: r.item_id });
  }
  return out;
}

async function write(row: Row): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "setting_key,item_id" });
  if (error) console.warn("[supabase] save shared setting:", error.message);
  return !error;
}

async function drop(key: string, id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("setting_key", key).eq("item_id", id);
  if (error) console.warn("[supabase] remove shared setting:", error.message);
  return !error;
}

/** Saves an item for every user (adds it, or replaces the global / built-in copy). */
export const saveSharedItem = (key: string, item: { id: string }) =>
  write({ setting_key: key, item_id: item.id, item, deleted: false });

/** Removes an item for every user: a built-in one is marked removed, a global-only one is deleted. */
export const removeSharedItem = (key: string, id: string, isBuiltIn: boolean) =>
  isBuiltIn ? write({ setting_key: key, item_id: id, item: null, deleted: true }) : drop(key, id);

/** Drops the global row, so the built-in item shows again as it is in the data file. */
export const clearSharedItem = (key: string, id: string) => drop(key, id);

/** Saves a one-value setting for every user. */
export const saveSharedValue = (key: string, value: unknown) =>
  write({ setting_key: key, item_id: VALUE_ID, item: value, deleted: false });

/** Removes the global copy of a one-value setting (back to the built-in default). */
export const clearSharedValue = (key: string) => drop(key, VALUE_ID);
