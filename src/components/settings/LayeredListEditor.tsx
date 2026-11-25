import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, RotateCcw, Globe, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AsyncButton } from "@/components/ui/async-button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { LayeredLibrary } from "@/hooks/useLayeredLibrary";
import { requireAdminPassword } from "@/lib/passwordGate";

export type SaveScope = "local" | "global";

/** What a form gets: the item to edit and the two save buttons' handlers. */
export interface ItemFormProps<T> {
  initial: T;
  isNew: boolean;
  /** Save locally: this browser only. */
  onSaveLocal: (item: T) => Promise<void>;
  /** Save globally: every user. */
  onSaveGlobal: (item: T) => Promise<void>;
  onCancel: () => void;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The list part of every Settings page: items with Edit / Delete, an "Add"
 * button that opens the new item AT THE TOP (so it's seen straight away),
 * and Save locally / Save globally on every form.
 *
 *  - A new item saved with nothing entered is dropped, not added.
 *  - An edit saved without changes saves nothing (no copy is made).
 *  - After saving, the list scrolls to the item and highlights it.
 */
export function LayeredListEditor<T extends { id: string }>({
  lib, itemLabel, newItem, isBlank, renderSummary, renderForm, filter, headerExtra, renderRowExtra,
}: {
  lib: LayeredLibrary<T>;
  itemLabel: string;
  /** A fresh item (with a new id) for "Add". */
  newItem: () => T;
  /** True when a new item has nothing worth keeping (e.g. no title). */
  isBlank: (item: T) => boolean;
  renderSummary: (item: T) => ReactNode;
  renderForm: (props: ItemFormProps<T>) => ReactNode;
  /** Show only some of the list on this page. */
  filter?: (item: T) => boolean;
  headerExtra?: ReactNode;
  /** Controls shown on each row next to Edit (e.g. a quick on/off switch). */
  renderRowExtra?: (item: T) => ReactNode;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ template: T; item: T } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const shown = filter ? lib.items.filter(filter) : lib.items;

  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`lib-item-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, [highlight]);

  const add = () => {
    if (!requireAdminPassword("settings")) return;
    const item = newItem();
    setEditing(null);
    setDraft({ template: item, item });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (item: T, scope: SaveScope, original: T, isNew: boolean) => {
    if (!requireAdminPassword("settings")) return;
    if (isNew && (isBlank(item) || same(item, original))) {
      setDraft(null);
      toast.info(`Nothing was entered, so no new ${itemLabel} was added.`);
      return;
    }
    // Unchanged: nothing to save, except promoting this browser's copy to every user.
    if (!isNew && same(item, original) && !(scope === "global" && lib.scopeOf(item.id) === "local")) {
      setEditing(null);
      toast.info("No changes to save.");
      return;
    }
    if (scope === "local") {
      lib.saveLocal(item);
      toast.success("Saved locally (this browser only).");
    } else {
      const ok = await lib.saveGlobal(item);
      if (!ok) {
        toast.error("Could not save globally. Check the internet connection and try again.");
        return;
      }
      toast.success("Saved globally: every user now sees it.");
    }
    if (isNew) setDraft(null);
    else setEditing(null);
    setHighlight(item.id);
  };

  const askDelete = (item: T) => {
    if (!requireAdminPassword("settings")) return;
    if (lib.existsBeyondLocal(item.id)) { setDeleting(item); return; }
    // Only in this browser: delete straight away, with Undo.
    lib.removeLocal(item.id);
    toast.success("Deleted", { duration: 10000, action: { label: "Undo", onClick: () => lib.saveLocal(item) } });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="text-sm text-muted-foreground">{shown.length} {itemLabel}(s)</div>
        <div className="flex flex-wrap gap-2">
          {headerExtra}
          {lib.hasLocalChanges && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!requireAdminPassword("settings")) return;
                if (!window.confirm("Undo every change saved locally (this browser only) on this page? Global changes stay.")) return;
                lib.resetLocal();
                setEditing(null);
                toast.success("Local changes removed");
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />Undo local changes
            </Button>
          )}
          <Button size="sm" onClick={add} disabled={!!draft}><Plus className="h-3 w-3 mr-1" />Add {itemLabel}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /><strong>Save locally</strong>: this browser only.</span>
        <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /><strong>Save globally</strong>: every user, permanently.</span>
      </div>

      {draft && (
        <div className="border-2 border-blue-500 rounded p-3 bg-blue-50/40">
          <div className="text-xs font-semibold text-blue-700 mb-2">New {itemLabel}</div>
          {renderForm({
            initial: draft.item,
            isNew: true,
            onSaveLocal: (item) => save(item, "local", draft.template, true),
            onSaveGlobal: (item) => save(item, "global", draft.template, true),
            onCancel: () => setDraft(null),
          })}
        </div>
      )}

      {shown.map(item => {
        const scope = lib.scopeOf(item.id);
        return (
          <div
            key={item.id}
            id={`lib-item-${item.id}`}
            className={`border rounded p-3 transition-shadow ${highlight === item.id ? "ring-2 ring-emerald-400 bg-emerald-50/50" : ""}`}
          >
            {editing === item.id ? (
              renderForm({
                initial: item,
                isNew: false,
                onSaveLocal: (next) => save(next, "local", item, false),
                onSaveGlobal: (next) => save(next, "global", item, false),
                onCancel: () => setEditing(null),
              })
            ) : (
              <div className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSummary(item)}
                    <ScopeBadge scope={scope} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {renderRowExtra?.(item)}
                  <Button size="sm" variant="outline" onClick={() => { setDraft(null); setEditing(item.id); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => askDelete(item)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <RestoreList
        title="Removed for every user"
        items={lib.globallyRemoved.filter(i => !filter || filter(i))}
        renderSummary={renderSummary}
        buttonLabel="Restore for everyone"
        onRestore={async (id) => {
          if (!requireAdminPassword("settings")) return;
          if (await lib.restoreGlobal(id)) toast.success("Restored for every user");
          else toast.error("Could not restore it. Try again.");
        }}
      />
      <RestoreList
        title="Removed in this browser"
        items={lib.locallyRemoved.filter(i => !filter || filter(i))}
        renderSummary={renderSummary}
        buttonLabel="Restore"
        onRestore={async (id) => { lib.restoreLocal(id); toast.success("Restored"); }}
      />

      <Dialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this {itemLabel}?</DialogTitle>
            <DialogDescription>
              Remove it from this browser only, or for every user.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!deleting) return;
                  lib.removeLocal(deleting.id);
                  setDeleting(null);
                  toast.success("Removed in this browser");
                }}
              >
                <Monitor className="h-3 w-3 mr-1" />This browser only
              </Button>
              <AsyncButton
                variant="destructive"
                pendingText="Removing…"
                onClick={async () => {
                  if (!deleting) return;
                  const ok = await lib.removeGlobal(deleting.id);
                  if (!ok) { toast.error("Could not remove it for everyone. Try again."); return; }
                  setDeleting(null);
                  toast.success("Removed for every user");
                }}
              >
                <Globe className="h-3 w-3 mr-1" />For every user
              </AsyncButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ScopeBadge({ scope }: { scope: "builtin" | "global" | "local" }) {
  if (scope === "local")
    return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">This browser only</span>;
  if (scope === "global")
    return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Global</span>;
  return null;
}

/** The two save buttons at the bottom of every Settings form. */
export function SaveButtons({ onCancel, onSaveLocal, onSaveGlobal, disabled }: {
  onCancel: () => void;
  onSaveLocal: () => Promise<void>;
  onSaveGlobal: () => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      <AsyncButton size="sm" variant="outline" disabled={disabled} onClick={onSaveLocal} title="This browser only">
        <Monitor className="h-3 w-3 mr-1" />Save locally
      </AsyncButton>
      <AsyncButton size="sm" disabled={disabled} onClick={onSaveGlobal} pendingText="Saving…" title="Every user, permanently">
        <Globe className="h-3 w-3 mr-1" />Save globally
      </AsyncButton>
    </div>
  );
}

function RestoreList<T extends { id: string }>({ title, items, renderSummary, buttonLabel, onRestore }: {
  title: string;
  items: T[];
  renderSummary: (item: T) => ReactNode;
  buttonLabel: string;
  onRestore: (id: string) => Promise<void>;
}) {
  if (!items.length) return null;
  return (
    <div className="border border-dashed rounded p-3 space-y-2 bg-slate-50">
      <div className="text-sm font-semibold text-slate-700">{title} ({items.length})</div>
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between gap-3 border-t pt-2">
          <div className="min-w-0 text-sm text-slate-600">{renderSummary(item)}</div>
          <AsyncButton size="sm" variant="outline" onClick={() => onRestore(item.id)}>
            <RotateCcw className="h-3 w-3 mr-1" />{buttonLabel}
          </AsyncButton>
        </div>
      ))}
    </div>
  );
}
