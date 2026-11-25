import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SubsystemContent, SubsystemImageSize } from "@/data/proposalContent";
import { SubsystemImages, defaultImageSize } from "@/components/pdf/pages/SubsystemsPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

/**
 * Title, wizard line, description, images (with size) and the "show in the
 * PDF" switch of one Major Subsystem. Used in Settings and, for subsystems
 * added to one quotation only, in the wizard. `actions` renders the buttons.
 */
export function SubsystemForm({ initial, actions, autoFocus }: {
  initial: SubsystemContent;
  actions: (current: SubsystemContent, busy: boolean) => ReactNode;
  autoFocus?: boolean;
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
    setImages(images, sizes.map((z, j) => (j === i ? { ...z, ...patch } : z)));

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
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium">Title</label>
          <Input autoFocus={autoFocus} value={s.title} placeholder="e.g. Oil Filtration Unit" onChange={e => setS({ ...s, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Short line (wizard list and pricing table)</label>
          <Input value={s.preview} placeholder="One short line" onChange={e => setS({ ...s, preview: e.target.value })} />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded border bg-slate-50 p-2.5 cursor-pointer">
        <Switch checked={!s.pricingOnly} onCheckedChange={on => setS({ ...s, pricingOnly: !on })} className="mt-0.5" />
        <span className="text-sm">
          <span className="font-medium">Show title &amp; description in the PDF</span>
          <span className="block text-xs text-muted-foreground">
            On: when ticked in a quotation it gets its own block in the Major Subsystems pages <em>and</em> a row in the
            pricing table. Off: only the pricing row is printed.
          </span>
        </span>
      </label>

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
        <label
          className={`inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98] ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? "Adding images…" : images.length ? "Add more images" : "Upload images"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={e => { void onFiles(e.target.files); e.target.value = ""; }}
          />
        </label>
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

      {actions(s, busy)}
    </div>
  );
}

/** A subsystem a new form starts from (nothing typed yet). */
export const blankSubsystem = (id: string): SubsystemContent => ({ id, title: "", preview: "", description: "" });

/** True when nothing worth keeping was entered. */
export const isBlankSubsystem = (s: SubsystemContent) =>
  !s.title.trim() && !s.description.trim() && !s.preview.trim() && !(s.images?.length);

// Photos are scaled down to at most 1600px and saved as JPEG on a white
// background before they're stored: still sharp at the PDF's largest size,
// but small enough for the browser's storage and the database.
const MAX_IMAGE_PX = 1600;
export function shrinkImage(file: File): Promise<string> {
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
