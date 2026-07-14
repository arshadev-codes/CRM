import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import { getMajorSubsystems, type SubsystemContent } from "@/data/proposalContent";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";

// CMS storage key per system type. Overrides merge over the static library:
//   resolved = override || libraryItem
// Adds extend the array. Deletes mark by id.
type Override = { items: SubsystemContent[]; deleted: string[] };

const cmsKey = (st: SystemType) => `subsystems:${st}`;

const EMPTY_OVERRIDE: Override = { items: [], deleted: [] };
function useOverride(st: SystemType): [Override, (next: Override) => void] {
  const value = useProposalStore(s => (s.cmsOverrides[cmsKey(st)] as Override | undefined)) ?? EMPTY_OVERRIDE;
  const setCms = useProposalStore(s => s.setCms);
  return [value, (next) => setCms(cmsKey(st), next)];
}

export const Route = createFileRoute("/settings/subsystems")({
  component: () => (
    <SettingsShell title="Major Sub Systems">
      <p className="text-sm text-muted-foreground mb-4">
        This library powers the auto-generated <strong>Major Subsystems</strong> pages of the PDF. Edits here apply to all
        future proposals. Semi-Automatic and Conventional system types fall back to the Advanced library when their own
        library is empty — that behaviour is permanent and intentional.
      </p>
      <Tabs defaultValue="Advanced" className="w-full">
        <TabsList>
          {systemTypesData.map(st => (
            <TabsTrigger key={st.id} value={st.id}>{st.label}</TabsTrigger>
          ))}
        </TabsList>
        {systemTypesData.map(st => (
          <TabsContent key={st.id} value={st.id}>
            <SubsystemsEditor systemType={st.id} />
          </TabsContent>
        ))}
      </Tabs>
    </SettingsShell>
  ),
});

function SubsystemsEditor({ systemType }: { systemType: SystemType }) {
  const base = getMajorSubsystems(systemType);
  const [override, setOverride] = useOverride(systemType);
  const [editing, setEditing] = useState<string | null>(null);

  const allItems: SubsystemContent[] = [
    ...base.filter(b => !override.deleted.includes(b.id)),
    ...override.items,
  ];

  const upsert = (item: SubsystemContent) => {
    const isBase = base.some(b => b.id === item.id);
    if (isBase) {
      // promote to override (replace base by deleting + adding to overrides)
      setOverride({
        deleted: Array.from(new Set([...override.deleted, item.id])),
        items: [...override.items.filter(i => i.id !== item.id), item],
      });
    } else {
      setOverride({ ...override, items: override.items.map(i => i.id === item.id ? item : i) });
    }
    toast.success("Saved");
  };

  const removeItem = (id: string) => {
    const isBase = base.some(b => b.id === id);
    if (isBase) {
      setOverride({ ...override, deleted: Array.from(new Set([...override.deleted, id])) });
    } else {
      setOverride({ ...override, items: override.items.filter(i => i.id !== id) });
    }
    toast.success("Deleted");
  };

  const add = () => {
    if (!requireAdminPassword()) return;
    const item: SubsystemContent = { id: crypto.randomUUID(), title: "New subsystem", preview: "", description: "" };
    setOverride({ ...override, items: [...override.items, item] });
    setEditing(item.id);
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {allItems.length} item(s) · {override.items.length} customised / added · {override.deleted.length} deleted
        </div>
        <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add subsystem</Button>
      </div>

      {allItems.map(item => {
        const isEditing = editing === item.id;
        return (
          <div key={item.id} className="border rounded p-3 space-y-2">
            {!isEditing ? (
              <div className="flex justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.preview}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(item.id)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <SubsystemForm
                initial={item}
                onCancel={() => setEditing(null)}
                onSave={updated => { upsert(updated); setEditing(null); }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubsystemForm({ initial, onSave, onCancel }: {
  initial: SubsystemContent; onSave: (s: SubsystemContent) => void; onCancel: () => void;
}) {
  const [s, setS] = useState(initial);
  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setS(prev => ({ ...prev, images: [String(reader.result)] }));
    reader.readAsDataURL(file);
  };
  const firstImage = s.images?.[0];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium">Title</label>
          <Input value={s.title} onChange={e => setS({ ...s, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Wizard preview (one short line)</label>
          <Input value={s.preview} onChange={e => setS({ ...s, preview: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">Full description (used in PDF)</label>
        <Textarea rows={6} value={s.description} onChange={e => setS({ ...s, description: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-medium">Image</label>
        <div className="flex items-center gap-3">
          {firstImage && <img src={firstImage} alt="" className="w-24 h-16 object-contain border rounded" />}
          <Input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0] ?? null)} />
          {firstImage && <Button size="sm" variant="ghost" onClick={() => setS({ ...s, images: undefined })}>Remove</Button>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(s)}>Save</Button>
      </div>
    </div>
  );
}
