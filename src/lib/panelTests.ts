import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabase as orderDb } from "@/lib/db";
import { mapPanel, type Panel, type PanelRow } from "@/lib/production";

// The panel tests library: each panel type (Control Desk, RIO Panel, LT Distribution Board...)
// and the tests done on it. Kept by the design team; the Testing page gives every panel of an
// order the tests of its panel type.

type TemplateRow = Database["public"]["Tables"]["panel_test_templates"]["Row"];

export type PanelTest = { group: string; title: string };

export type PanelTemplate = {
  id: string;
  name: string;
  /** Other names the same panel goes by in a BOM ("Test Bench" for "Control Desk"). */
  aliases: string[];
  tests: PanelTest[];
  displayOrder: number;
};

/** Groups offered when adding a test; any other can be typed in. */
export const TEST_GROUPS = [
  "Enclosure",
  "Checklist",
  "Megger test at 1000V (MΩ)",
  "HV test for 1 minute",
  "Megger test after HV (MΩ)",
  "Power ON test",
  "Other tests",
];

function asTests(value: Json): PanelTest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((t) => {
    if (!t || typeof t !== "object" || Array.isArray(t)) return [];
    const title = typeof t.title === "string" ? t.title.trim() : "";
    return title ? [{ group: typeof t.group === "string" ? t.group.trim() : "", title }] : [];
  });
}

function fromRow(row: TemplateRow): PanelTemplate {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    tests: asTests(row.tests),
    displayOrder: row.display_order,
  };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The library entry for a panel of an order, by its name. An exact name or alias wins;
 * otherwise the longest name/alias found inside the panel's name ("RIO Panel - 2" → RIO Panel).
 */
export function matchTemplate(panelName: string, templates: PanelTemplate[]) {
  const name = norm(panelName);
  if (!name) return undefined;
  let best: { t: PanelTemplate; len: number } | undefined;
  for (const t of templates) {
    for (const n of [t.name, ...t.aliases].map(norm).filter(Boolean)) {
      if (n === name) return t;
      if (` ${name} `.includes(` ${n} `) && (!best || n.length > best.len))
        best = { t, len: n.length };
    }
  }
  return best?.t;
}

/** Stable key of a library test, so the same test is never added twice to a panel. */
export const testKey = (t: PanelTest) => `${norm(t.group)}|${norm(t.title)}`;

export function usePanelTemplates() {
  const [templates, setTemplates] = useState<PanelTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("panel_test_templates")
      .select("*")
      .order("display_order")
      .order("name");
    if (!error && data) setTemplates(data.map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (t: Omit<PanelTemplate, "id"> & { id?: string }) => {
      const row = {
        name: t.name.trim(),
        aliases: t.aliases.map((a) => a.trim()).filter(Boolean),
        tests: t.tests.filter((x) => x.title.trim()) as unknown as Json,
        display_order: t.displayOrder,
      };
      const { error } = t.id
        ? await supabase.from("panel_test_templates").update(row).eq("id", t.id)
        : await supabase.from("panel_test_templates").insert(row);
      if (error) {
        toast.error(
          error.code === "23505"
            ? "A panel with this name already exists"
            : "Could not save — check your connection or permission",
        );
        return false;
      }
      await reload();
      return true;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("panel_test_templates").delete().eq("id", id);
      if (error) toast.error("Could not delete — check your connection or permission");
      await reload();
    },
    [reload],
  );

  return { templates, loading, reload, save, remove };
}

/** The panels of an order (from the BOM / Production), in their usual order. */
export function useOrderPanels(orderId: string) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void orderDb
      .from("production_panels")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("display_order")
      .order("created_at")
      .then(({ data }) => {
        if (!alive) return;
        setPanels(((data ?? []) as PanelRow[]).map(mapPanel));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);
  return { panels, loading };
}
