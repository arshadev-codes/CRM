import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { familyOf, type CatalogKind } from "@/data/catalogFamilies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any> & { id: string };

const SPEC_KEYS = ["spec1", "spec2", "spec3", "spec4", "spec5"] as const;

/** The line under an item's name: make · model (instruments) then its specs. */
function details(kind: CatalogKind, item: AnyRow): string {
  const parts = kind === "instruments" ? [item.make, item.model] : [];
  return [...parts, ...SPEC_KEYS.map((k) => item[k])]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" · ");
}

function searchText(kind: CatalogKind, item: AnyRow, family: string): string {
  const aliases = Array.isArray(item.aliases) ? item.aliases.join(" ") : "";
  return [
    family,
    item[kind === "equipment" ? "equipment" : "instrument"],
    details(kind, item),
    aliases,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * "Add from list" picker: the whole library, grouped by family so variants of
 * the same item sit together, with search and multi-select. A custom item can
 * be added when nothing in the list fits.
 */
export function CatalogPickerDialog({
  open,
  onOpenChange,
  kind,
  library,
  addedIds,
  onAdd,
  onAddCustom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CatalogKind;
  library: AnyRow[];
  /** Library ids already in the table — shown as "Added". */
  addedIds: Set<string>;
  onAdd: (items: AnyRow[]) => void;
  onAddCustom: () => void;
}) {
  const nameKey = kind === "equipment" ? "equipment" : "instrument";
  const noun = kind === "equipment" ? "equipment" : "instrument";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const families = useMemo(() => {
    const groups = new Map<string, AnyRow[]>();
    for (const item of library) {
      const fam = familyOf(kind, item);
      if (!groups.has(fam)) groups.set(fam, []);
      groups.get(fam)!.push(item);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [library, kind]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return families;
    const words = q.split(/\s+/);
    return families
      .map(
        ([fam, items]) =>
          [
            fam,
            items.filter((it) => {
              const text = searchText(kind, it, fam);
              return words.every((w) => text.includes(w));
            }),
          ] as const,
      )
      .filter(([, items]) => items.length > 0);
  }, [families, q, kind]);

  const reset = () => {
    setQuery("");
    setSelected(new Set());
    setExpanded(new Set());
  };
  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleItem = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleFamily = (fam: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fam)) next.delete(fam);
      else next.add(fam);
      return next;
    });

  const confirm = () => {
    onAdd(library.filter((it) => selected.has(it.id)));
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {noun}</DialogTitle>
          <DialogDescription>
            Items are grouped by type — open a group to see its variants. Tick as many as you need.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder={
              kind === "equipment"
                ? "Search, e.g. HV transformer 300 kV"
                : "Search, e.g. ratio meter Motwane"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-md border">
          {visible.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing matches “{query}”. Use <strong>Add custom {noun}</strong> below.
            </p>
          )}
          {visible.map(([fam, items]) => {
            const open = !!q || expanded.has(fam);
            const picked = items.filter((it) => selected.has(it.id)).length;
            return (
              <div key={fam} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleFamily(fam)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/60"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="flex-1">{fam}</span>
                  {picked > 0 && <Badge className="h-5">{picked} selected</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "variant" : "variants"}
                  </span>
                </button>
                {open && (
                  <ul className="pb-1">
                    {items.map((it) => {
                      const info = details(kind, it);
                      return (
                        <li key={it.id}>
                          <label className="flex cursor-pointer items-start gap-3 py-1.5 pl-9 pr-3 hover:bg-muted/40">
                            <Checkbox
                              className="mt-0.5"
                              checked={selected.has(it.id)}
                              onCheckedChange={() => toggleItem(it.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm">{String(it[nameKey] ?? "")}</span>
                              {info && (
                                <span className="block text-xs text-muted-foreground">{info}</span>
                              )}
                            </span>
                            {addedIds.has(it.id) && (
                              <Badge variant="secondary" className="h-5 shrink-0">
                                Added
                              </Badge>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onAddCustom();
              close(false);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add custom {noun}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button disabled={selected.size === 0} onClick={confirm}>
              Add {selected.size || ""} selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
