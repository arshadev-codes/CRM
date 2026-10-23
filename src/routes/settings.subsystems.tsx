import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import {
  getBaseMajorSubsystems, applySubsystemOverride, subsystemsCmsKey,
  type SubsystemContent, type SubsystemImageSize, type SubsystemOverride,
} from "@/data/proposalContent";
import { SubsystemImages, defaultImageSize } from "@/components/pdf/pages/SubsystemsPdf";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";

// CMS storage key per system type. Overrides merge over the static library
// (see applySubsystemOverride): edited items replace their base copy in place,
// adds extend the array, deletes mark by id.
type Override = SubsystemOverride;

const EMPTY_OVERRIDE: Override = { items: [], deleted: [] };
function useOverride(st: SystemType): [Override, (next: Override) => void] {
  const value = useProposalStore(s => (s.cmsOverrides[subsystemsCmsKey(st)] as Override | undefined)) ?? EMPTY_OVERRIDE;
  const setCms = useProposalStore(s => s.setCms);
  return [value, (next) => setCms(subsystemsCmsKey(st), next)];
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
  const base = getBaseMajorSubsystems(systemType);
  const [override, setOverride] = useOverride(systemType);
  const [editing, setEditing] = useState<string | null>(null);

  const allItems = applySubsystemOverride(base, override);

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
      setOverride({
        deleted: Array.from(new Set([...override.deleted, id])),
        items: override.items.filter(i => i.id !== id),
      });
    } else {
      setOverride({ ...override, items: override.items.filter(i => i.id !== id) });
    }
    toast.success("Deleted");
  };

  const add = () => {
    if (!requireAdminPassword("settings")) return;
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
  const [busy, setBusy] = useState(false);
  const images = s.images ?? [];
  // Every image gets a size once the list is edited, so the PDF uses exactly
  // what the preview shows.
  const sizes: SubsystemImageSize[] = images.map((_, i) => s.imageSizes?.[i] ?? defaultImageSize(images.length));

  const setImages = (nextImages: string[], nextSizes: SubsystemImageSize[]) =>
    setS(prev => ({
      ...prev,
      images: nextImages.length ? nextImages : undefined,
      imageSizes: nextImages.length ? nextSizes : undefined,
    }));

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const added = await Promise.all(Array.from(files).map(shrinkImage));
      const nextImages = [...images, ...added];
      // Newly added images share the row evenly; images already sized keep their size.
      const fresh = defaultImageSize(nextImages.length);
      setImages(nextImages, [...(s.imageSizes ? sizes : sizes.map(() => fresh)), ...added.map(() => fresh)]);
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusy(false);
    }
  };

  const setSize = (i: number, patch: Partial<SubsystemImageSize>) =>
    setImages(images, sizes.map((z, j) => j === i ? { ...z, ...patch } : z));

  const removeImage = (i: number) =>
    setImages(images.filter((_, j) => j !== i), sizes.filter((_, j) => j !== i));

  const moveImage = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= images.length) return;
    const imgs = [...images]; const zs = [...sizes];
    [imgs[i], imgs[ni]] = [imgs[ni], imgs[i]];
    [zs[i], zs[ni]] = [zs[ni], zs[i]];
    setImages(imgs, zs);
  };

  const evenSizes = () => {
    const d = defaultImageSize(images.length);
    setImages(images, images.map(() => ({ ...d })));
  };

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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium">Images ({images.length})</label>
          {images.length > 1 && (
            <Button size="sm" variant="ghost" onClick={evenSizes}>Make all equal</Button>
          )}
        </div>
        <Input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={e => { void onFiles(e.target.files); e.target.value = ""; }}
        />
        <p className="text-[11px] text-muted-foreground">
          You can pick several images at once. Width is a share of the page width — two images at 50% sit side by side,
          two at 100% sit one below the other.
        </p>

        {images.map((src, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-3 border rounded p-2">
            <img src={src} alt="" className="w-24 h-16 object-contain border rounded bg-white shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-xs"><span>Width</span><span>{sizes[i].width}%</span></div>
                <Slider min={10} max={100} step={5} value={[sizes[i].width]} onValueChange={([v]) => setSize(i, { width: v })} />
              </div>
              <div>
                <div className="flex justify-between text-xs"><span>Height</span><span>{sizes[i].height} mm</span></div>
                <Slider min={30} max={180} step={5} value={[sizes[i].height]} onValueChange={([v]) => setSize(i, { height: v })} />
              </div>
            </div>
            <div className="flex sm:flex-col gap-1 shrink-0">
              <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => moveImage(i, -1)} title="Move earlier"><ArrowUp className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" disabled={i === images.length - 1} onClick={() => moveImage(i, 1)} title="Move later"><ArrowDown className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => removeImage(i)} title="Remove"><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}

        {images.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Preview (as it will look in the PDF)</div>
            <div className="border rounded bg-white overflow-hidden" style={{ maxWidth: "91mm" }}>
              {/* Half-size copy of the PDF's 182mm text width */}
              <div style={{ width: "182mm", padding: "0 0 3mm", zoom: 0.5 }}>
                <SubsystemImages images={images} sizes={sizes} title={s.title} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={busy} onClick={() => onSave(s)}>Save</Button>
      </div>
    </div>
  );
}

// Settings are kept in this browser's storage (a few MB in total), so photos are
// scaled down to at most 1600px and saved as JPEG on a white background before
// they're stored. That is still sharp at the PDF's largest image size.
const MAX_IMAGE_PX = 1600;
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bad image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result)); return; }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
