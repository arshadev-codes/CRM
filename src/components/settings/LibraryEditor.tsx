import { useState } from "react";
import { useProposalStore } from "@/store/proposalStore";
import {
  LIBRARIES, getLibrary, type LibraryItem, type LibraryName, type LibraryOverride,
} from "@/data/libraries";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";

export type LibraryField =
  | { key: string; label: string; type: "text" | "textarea"; placeholder?: string }
  | { key: string; label: string; type: "checkbox"; hint?: string }
  | { key: string; label: string; type: "select"; options: string[] }
  /** A list of words, one per line in the form. */
  | { key: string; label: string; type: "list"; hint?: string }
  /** Which system types the item shows for. Empty = all. */
  | { key: string; label: string; type: "systemTypes" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = Record<string, any> & { id: string };

/**
 * Add / edit / delete for one library in src/data/libraries.ts. Built-in items
 * can be edited or deleted too; "Reset" brings back the built-in list.
 */
export function LibraryEditor<N extends LibraryName>({
  library, fields, titleKey, subtitle, newItem, filter, itemLabel = "item",
}: {
  library: N;
  fields: LibraryField[];
  /** Field shown as the row heading. */
  titleKey: string;
  /** Short grey line under the heading. */
  subtitle?: (item: LibraryItem[N]) => string;
  /** Starting values for a new item (id is added for you). */
  newItem: Omit<LibraryItem[N], "id">;
  /** Show only some of the library on this page. */
  filter?: (item: LibraryItem[N]) => boolean;
  itemLabel?: string;
}) {
  const { key, base } = LIBRARIES[library];
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  const setCms = useProposalStore(s => s.setCms);
  const override = (cmsOverrides[key] as LibraryOverride<AnyItem> | undefined) ?? { items: [], deleted: [] };
  const all = getLibrary(library, cmsOverrides);
  const shown = filter ? all.filter(filter) : all;
  const baseIds = new Set((base as readonly AnyItem[]).map(b => b.id));
  const [editing, setEditing] = useState<string | null>(null);

  const save = (next: LibraryOverride<AnyItem>) => setCms(key, next);

  const upsert = (item: AnyItem) => {
    if (!requireAdminPassword("settings")) return;
    const items = override.items.some(i => i.id === item.id)
      ? override.items.map(i => i.id === item.id ? item : i)
      : [...override.items, item];
    const deleted = baseIds.has(item.id) ? Array.from(new Set([...override.deleted, item.id])) : override.deleted;
    save({ items, deleted });
    setEditing(null);
    toast.success("Saved");
  };

  const remove = (id: string) => {
    if (!requireAdminPassword("settings")) return;
    save({
      items: override.items.filter(i => i.id !== id),
      deleted: baseIds.has(id) ? Array.from(new Set([...override.deleted, id])) : override.deleted,
    });
    toast.success("Deleted");
  };

  const add = () => {
    if (!requireAdminPassword("settings")) return;
    const item = { ...newItem, id: crypto.randomUUID() } as AnyItem;
    save({ ...override, items: [...override.items, item] });
    setEditing(item.id);
  };

  const reset = () => {
    if (!requireAdminPassword("settings")) return;
    if (!window.confirm("Bring back the built-in list? Every change made on this page will be lost.")) return;
    save({ items: [], deleted: [] });
    setEditing(null);
    toast.success("Reset to built-in list");
  };

  const changed = override.items.length + override.deleted.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="text-sm text-muted-foreground">{shown.length} {itemLabel}(s)</div>
        <div className="flex gap-2">
          {changed && (
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
          )}
          <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add {itemLabel}</Button>
        </div>
      </div>

      {shown.map(raw => {
        const item = raw as unknown as AnyItem;
        return (
          <div key={item.id} className="border rounded p-3">
            {editing === item.id ? (
              <ItemForm initial={item} fields={fields} onCancel={() => setEditing(null)} onSave={upsert} />
            ) : (
              <div className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{String(item[titleKey] || "(no name)")}</div>
                  {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle(raw)}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(item.id)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(item.id)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemForm({ initial, fields, onSave, onCancel }: {
  initial: AnyItem; fields: LibraryField[]; onSave: (item: AnyItem) => void; onCancel: () => void;
}) {
  const [v, setV] = useState<AnyItem>(initial);
  const set = (key: string, value: unknown) => setV(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => {
          const wide = f.type === "textarea" || f.type === "list" || f.type === "systemTypes";
          return (
            <div key={f.key} className={wide ? "md:col-span-2" : ""}>
              {f.type !== "checkbox" && <label className="text-xs font-medium">{f.label}</label>}
              <FieldInput field={f} value={v[f.key]} onChange={val => set(f.key, val)} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(v)}>Save</Button>
      </div>
    </div>
  );
}

function FieldInput({ field: f, value, onChange }: { field: LibraryField; value: unknown; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case "text":
      return <Input value={String(value ?? "")} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />;
    case "textarea":
      return <Textarea rows={4} value={String(value ?? "")} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />;
    case "checkbox":
      return (
        <label className="flex items-start gap-2 text-sm cursor-pointer pt-1">
          <Checkbox checked={!!value} onCheckedChange={c => onChange(!!c)} className="mt-0.5" />
          <span>
            {f.label}
            {f.hint && <span className="block text-xs text-muted-foreground">{f.hint}</span>}
          </span>
        </label>
      );
    case "select": {
      const current = String(value ?? "");
      // Keep a saved value that is no longer in the options list selectable.
      const options = current && !f.options.includes(current) ? [current, ...f.options] : f.options;
      return (
        <Select value={current} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    case "list":
      return (
        <>
          <ListInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
          {f.hint && <p className="text-[11px] text-muted-foreground mt-1">{f.hint}</p>}
        </>
      );
    case "systemTypes": {
      const selected = Array.isArray(value) ? (value as SystemType[]) : [];
      const toggle = (st: SystemType) =>
        onChange(selected.includes(st) ? selected.filter(x => x !== st) : [...selected, st]);
      return (
        <>
          <div className="flex flex-wrap gap-3 pt-1">
            {systemTypesData.map(st => (
              <label key={st.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(st.id)} onCheckedChange={() => toggle(st.id)} />
                {st.label}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Tick none to show it for every system type.</p>
        </>
      );
    }
  }
}

/** One entry per line. Kept as raw text while typing so blank lines don't vanish under the cursor. */
function ListInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Textarea
      rows={Math.min(10, Math.max(3, value.length + 1))}
      value={text}
      onChange={e => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map(x => x.trim()).filter(Boolean));
      }}
      placeholder="One per line"
    />
  );
}
