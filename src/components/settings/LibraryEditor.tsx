import { useState } from "react";
import { LIBRARIES, type LibraryItem, type LibraryName } from "@/data/libraries";
import { useLayeredLibrary } from "@/hooks/useLayeredLibrary";
import { LayeredListEditor, SaveButtons, type ItemFormProps } from "./LayeredListEditor";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
 * Add / edit / delete for one library in src/data/libraries.ts, with
 * Save locally (this browser) / Save globally (every user) on each item.
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
  const lib = useLayeredLibrary<AnyItem>(key, base as unknown as AnyItem[]);

  return (
    <LayeredListEditor<AnyItem>
      lib={lib}
      itemLabel={itemLabel}
      filter={filter as ((item: AnyItem) => boolean) | undefined}
      newItem={() => ({ ...(newItem as object), id: crypto.randomUUID() }) as AnyItem}
      isBlank={item => !String(item[titleKey] ?? "").trim()}
      renderSummary={item => (
        <div className="min-w-0">
          <div className="font-semibold text-sm">{String(item[titleKey] || "(no name)")}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle(item as unknown as LibraryItem[N])}</div>}
        </div>
      )}
      renderForm={props => <ItemForm {...props} fields={fields} />}
    />
  );
}

function ItemForm({ initial, isNew, fields, onSaveLocal, onSaveGlobal, onCancel }: ItemFormProps<AnyItem> & { fields: LibraryField[] }) {
  // A new item starts with empty text fields, so nothing has to be cleared first.
  const [v, setV] = useState<AnyItem>(() =>
    isNew
      ? Object.fromEntries(Object.entries(initial).map(([k, val]) => [k, typeof val === "string" && k !== "id" && fields.some(f => f.key === k && (f.type === "text" || f.type === "textarea")) ? "" : val])) as AnyItem
      : initial,
  );
  const set = (key: string, value: unknown) => setV(prev => ({ ...prev, [key]: value }));
  const firstText = fields.find(f => f.type === "text" || f.type === "textarea");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => {
          const wide = f.type === "textarea" || f.type === "list" || f.type === "systemTypes";
          return (
            <div key={f.key} className={wide ? "md:col-span-2" : ""}>
              {f.type !== "checkbox" && <label className="text-xs font-medium">{f.label}</label>}
              <FieldInput field={f} value={v[f.key]} onChange={val => set(f.key, val)} autoFocus={isNew && f === firstText} />
            </div>
          );
        })}
      </div>
      <SaveButtons onCancel={onCancel} onSaveLocal={() => onSaveLocal(v)} onSaveGlobal={() => onSaveGlobal(v)} />
    </div>
  );
}

function FieldInput({ field: f, value, onChange, autoFocus }: { field: LibraryField; value: unknown; onChange: (v: unknown) => void; autoFocus?: boolean }) {
  switch (f.type) {
    case "text":
      return <Input autoFocus={autoFocus} value={String(value ?? "")} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />;
    case "textarea":
      return <Textarea autoFocus={autoFocus} rows={4} value={String(value ?? "")} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />;
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
