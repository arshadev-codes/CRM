import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleDot,
  Download,
  ExternalLink,
  FileText,
  History,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import { STAGE_STATUSES, type Stage, type StageStatus } from "@/lib/stages";
import { PdfFirstPage } from "@/components/PdfFirstPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EASE,
  formatSize,
  formatStamp,
  initials,
  safeName,
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_TONE,
  timeAgo,
} from "./shared";

export const BUCKET = "inward-order-attachments";

type UpdateRow = Database["public"]["Tables"]["stage_updates"]["Row"];
type StageUpdate = {
  id: string;
  kind: "update" | "sld";
  author: string;
  remarks: string;
  status?: StageStatus;
  fileName?: string;
  storagePath?: string;
  contentType?: string;
  fileSize: number;
  createdAt: string;
};

function mapUpdate(row: UpdateRow): StageUpdate {
  return {
    id: row.id,
    kind: row.kind === "sld" ? "sld" : "update",
    author: row.author,
    remarks: row.remarks,
    status: (row.status as StageStatus | null) ?? undefined,
    fileName: row.file_name ?? undefined,
    storagePath: row.storage_path ?? undefined,
    contentType: row.content_type ?? undefined,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export type StageBodyProps = {
  orderId: string;
  slug: string;
  stageName: string;
  stage?: Stage;
  setStageStatus: (status: StageStatus) => Promise<boolean | undefined>;
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
};

// Design: the SLD drawing up top, then remarks and updates, newest first.
// Stages without a drawing (Fabrication, Production) use the updates feed alone.
export function DesignStage({
  orderId: id,
  slug,
  stageName,
  stage,
  setStageStatus,
  author,
  employees,
  onAuthor,
  drawingLabel = "Drawing",
  drawingTitle = "",
  showDrawing = true,
}: StageBodyProps & { drawingLabel?: string; drawingTitle?: string; showDrawing?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<StageUpdate[]>([]);

  const addUpdate = useCallback((update: StageUpdate) => {
    setUpdates((current) =>
      current.some((item) => item.id === update.id)
        ? current
        : [update, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const updateResult = await supabase
        .from("stage_updates")
        .select("*")
        .eq("inward_order_id", id)
        .eq("stage_name", stageName)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (updateResult.error) toast.error("Could not load updates");
      setUpdates((updateResult.data ?? []).map(mapUpdate));
      setLoading(false);
    }
    void load();

    // Live: other people's updates appear without a refresh.
    const channel = supabase
      .channel(`stage-updates-${id}-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stage_updates",
          filter: `inward_order_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as UpdateRow;
          if (row.stage_name === stageName) addUpdate(mapUpdate(row));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "stage_updates",
          filter: `inward_order_id=eq.${id}`,
        },
        (payload) => {
          const removed = (payload.old as Partial<UpdateRow>).id;
          if (removed) setUpdates((current) => current.filter((item) => item.id !== removed));
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [id, slug, stageName, addUpdate]);

  const drawings = useMemo(
    () =>
      updates
        .filter((item) => item.kind === "sld" && item.storagePath)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [updates],
  );
  const currentDrawing = drawings.at(-1);
  const revisionOf = useCallback(
    (update: StageUpdate) => drawings.findIndex((item) => item.id === update.id),
    [drawings],
  );

  async function uploadFile(file: File, folder: string) {
    const storagePath = `${id}/stages/${slug}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });
    return error ? null : storagePath;
  }

  async function insertUpdate(
    values: Omit<
      Database["public"]["Tables"]["stage_updates"]["Insert"],
      "inward_order_id" | "stage_name"
    >,
  ) {
    const { data, error } = await supabase
      .from("stage_updates")
      .insert({ inward_order_id: id, stage_name: stageName, ...values })
      .select("*")
      .single();
    if (error || !data) return null;
    const update = mapUpdate(data);
    addUpdate(update);
    return update;
  }

  async function uploadDrawing(file: File, remarks = "") {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error(`${drawingLabel} must be a PDF file`);
      return false;
    }
    const storagePath = await uploadFile(file, "drawings");
    if (!storagePath) {
      toast.error(`Could not upload ${file.name}`);
      return false;
    }
    const startsStage = stage?.status === "not started";
    const update = await insertUpdate({
      kind: "sld",
      author,
      remarks,
      file_name: file.name,
      storage_path: storagePath,
      content_type: "application/pdf",
      file_size: file.size,
      status: startsStage ? "in progress" : null,
    });
    if (!update) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      toast.error(`Could not save ${file.name}`);
      return false;
    }
    if (startsStage) await setStageStatus("in progress");
    toast.success(`${drawingLabel} R${drawings.length} uploaded`);
    return true;
  }

  async function postUpdate(values: { remarks: string; status?: StageStatus; file?: File }) {
    let storagePath: string | null = null;
    if (values.file) {
      storagePath = await uploadFile(values.file, "files");
      if (!storagePath) {
        toast.error(`Could not upload ${values.file.name}`);
        return false;
      }
    }
    const statusChange =
      values.status && values.status !== stage?.status ? values.status : undefined;
    const update = await insertUpdate({
      kind: "update",
      author,
      remarks: values.remarks,
      status: statusChange ?? null,
      file_name: values.file?.name ?? null,
      storage_path: storagePath,
      content_type: values.file?.type || null,
      file_size: values.file?.size ?? 0,
    });
    if (!update) {
      if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
      toast.error("Could not post the update");
      return false;
    }
    if (statusChange) await setStageStatus(statusChange);
    toast.success("Update posted");
    return true;
  }

  async function deleteUpdate(update: StageUpdate) {
    const { error } = await supabase.from("stage_updates").delete().eq("id", update.id);
    if (error) {
      toast.error("Could not delete the update");
      return;
    }
    if (update.storagePath) await supabase.storage.from(BUCKET).remove([update.storagePath]);
    setUpdates((current) => current.filter((item) => item.id !== update.id));
    toast.success("Update deleted");
  }

  async function openFile(update: StageUpdate, download: boolean) {
    if (!update.storagePath) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(
        update.storagePath,
        300,
        download ? { download: update.fileName ?? true } : undefined,
      );
    if (error || !data?.signedUrl) {
      toast.error("Could not open the file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {showDrawing && (
        <motion.section
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          className="mx-auto w-full max-w-[80vw] max-lg:max-w-full"
        >
          <DrawingPanel
            label={drawingLabel}
            title={drawingTitle}
            loading={loading}
            drawing={currentDrawing}
            revision={currentDrawing ? drawings.length - 1 : 0}
            onUpload={uploadDrawing}
            onOpen={(update) => void openFile(update, false)}
            onDownload={(update) => void openFile(update, true)}
          />
        </motion.section>
      )}

      <div
        className={`mx-auto grid w-full ${showDrawing ? "mt-8" : ""} max-w-[80vw] gap-6 max-lg:max-w-full lg:grid-cols-[minmax(300px,380px)_1fr]`}
      >
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.16 }}
        >
          <Composer
            author={author}
            employees={employees}
            onAuthor={onAuthor}
            currentStatus={stage?.status}
            onPost={postUpdate}
          />
        </motion.div>
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.22 }}
        >
          <Timeline
            loading={loading}
            updates={updates}
            drawingLabel={showDrawing ? drawingLabel : ""}
            revisionOf={revisionOf}
            onOpen={(update) => void openFile(update, false)}
            onDownload={(update) => void openFile(update, true)}
            onDelete={deleteUpdate}
          />
        </motion.div>
      </div>
    </>
  );
}

function DrawingPanel({
  label,
  title,
  loading,
  drawing,
  revision,
  onUpload,
  onOpen,
  onDownload,
}: {
  label: string;
  title: string;
  loading: boolean;
  drawing?: StageUpdate;
  revision: number;
  onUpload: (file: File) => Promise<boolean>;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setPreviewUrl(null);
    setPageCount(null);
    if (!drawing?.storagePath) return;
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(drawing.storagePath, 60 * 60)
      .then(({ data }) => {
        if (active && data?.signedUrl) setPreviewUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [drawing?.storagePath]);

  async function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(file.name);
    const ok = await onUpload(file);
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    if (ok) {
      setJustUploaded(true);
      window.setTimeout(() => setJustUploaded(false), 1600);
    }
  }

  const dragProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      void handle(event.dataTransfer.files);
    },
  };

  return (
    <div
      {...dragProps}
      className={`neo-surface group/panel relative overflow-hidden rounded-3xl p-3 transition-shadow duration-300 sm:p-4 ${dragging ? "ring-4 ring-primary/40" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handle(event.target.files)}
      />

      <div className="relative h-[40vh] min-h-[280px] overflow-hidden rounded-2xl neo-inset">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              exit={{ opacity: 0 }}
              className="grid h-full place-items-center"
            >
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : drawing && previewUrl ? (
            <motion.div
              key={drawing.id}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="h-full p-4"
            >
              <PdfFirstPage url={previewUrl} onRendered={setPageCount} />
            </motion.div>
          ) : drawing ? (
            <motion.div
              key="signing"
              exit={{ opacity: 0 }}
              className="grid h-full place-items-center"
            >
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.button
              key="empty"
              type="button"
              onClick={() => inputRef.current?.click()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group/upload flex h-full w-full flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-primary/25 text-center transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              <motion.span
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="neo-pop grid h-24 w-24 place-items-center rounded-3xl text-primary transition-transform duration-300 group-hover/upload:scale-110"
              >
                <UploadCloud className="h-11 w-11" />
              </motion.span>
              <span>
                <span className="block text-xl font-bold text-foreground sm:text-2xl">
                  Upload {label} PDF
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {title} · click or drop a PDF here · the first page is shown
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-chart-2 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 group-hover/upload:-translate-y-0.5 group-hover/upload:shadow-xl group-hover/upload:shadow-primary/40">
                <UploadCloud className="h-4 w-4" /> Choose {label}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {drawing && !uploading && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/35 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover/panel:pointer-events-auto group-hover/panel:opacity-100 group-focus-within/panel:pointer-events-auto group-focus-within/panel:opacity-100">
            <div className="flex translate-y-3 flex-wrap justify-center gap-2 transition-transform duration-300 group-hover/panel:translate-y-0">
              <Button size="sm" variant="secondary" onClick={() => onOpen(drawing)}>
                <ExternalLink /> Open full PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onDownload(drawing)}>
                <Download /> Download
              </Button>
              <Button size="sm" onClick={() => inputRef.current?.click()}>
                <RefreshCw /> Upload new revision
              </Button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 grid place-items-center bg-primary/10 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                className="neo-surface flex items-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold text-primary"
              >
                <UploadCloud className="h-6 w-6" /> Drop to upload{" "}
                {drawing ? "a new revision" : label}
              </motion.div>
            </motion.div>
          )}
          {uploading && <UploadOverlay key="uploading" fileName={uploading} />}
          {justUploaded && <SuccessBurst key="done" />}
        </AnimatePresence>
      </div>

      {drawing && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {label} · R{revision}
          </span>
          <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{drawing.fileName}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {[
              pageCount ? `${pageCount} page${pageCount > 1 ? "s" : ""}` : "",
              formatSize(drawing.fileSize),
              drawing.author ? `by ${drawing.author}` : "",
              timeAgo(drawing.createdAt),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(uploading)}
          >
            <RefreshCw /> New revision
          </Button>
        </div>
      )}
    </div>
  );
}

function UploadOverlay({ fileName }: { fileName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 16, scale: 0.94 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ ease: EASE }}
        className="neo-surface w-[min(360px,85%)] rounded-2xl p-6 text-center"
      >
        <div className="relative mx-auto h-16 w-16">
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-primary/15 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-0 grid place-items-center text-primary"
            animate={{ y: [2, -3, 2] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <UploadCloud className="h-7 w-7" />
          </motion.span>
        </div>
        <div className="mt-4 text-sm font-semibold text-foreground">Uploading…</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{fileName}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full neo-inset">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-chart-2"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessBurst() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      {[0, 1, 2].map((ring) => (
        <motion.span
          key={ring}
          className="absolute h-24 w-24 rounded-full border-2 border-emerald-400"
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 3 + ring, opacity: 0 }}
          transition={{ duration: 1.1, delay: ring * 0.12, ease: "easeOut" }}
        />
      ))}
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 16 }}
        className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40"
      >
        <Check className="h-10 w-10" strokeWidth={3} />
      </motion.span>
    </motion.div>
  );
}

function Composer({
  author,
  employees,
  onAuthor,
  currentStatus,
  onPost,
}: {
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
  currentStatus?: StageStatus;
  onPost: (values: { remarks: string; status?: StageStatus; file?: File }) => Promise<boolean>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<StageStatus | "same">("same");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const canPost = Boolean(remarks.trim() || file || status !== "same") && !posting;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canPost) return;
    setPosting(true);
    const ok = await onPost({
      remarks: remarks.trim(),
      status: status === "same" ? undefined : status,
      file: file ?? undefined,
    });
    setPosting(false);
    if (ok) {
      setRemarks("");
      setStatus("same");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form onSubmit={submit} className="neo-surface space-y-5 rounded-3xl p-6 lg:sticky lg:top-6">
      <div className="flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Post an update</h2>
          <p className="text-xs text-muted-foreground">Remarks, status changes and files</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-primary">Updated by</Label>
        <Select value={author || undefined} onValueChange={onAuthor}>
          <SelectTrigger aria-label="Updated by">
            <SelectValue placeholder="Select your name" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stage-remarks" className="text-xs font-semibold text-primary">
          Remarks
        </Label>
        <Textarea
          id="stage-remarks"
          rows={5}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="What changed? e.g. Work completed today, issue found, awaiting approval…"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(event);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-primary">Stage status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as StageStatus | "same")}>
          <SelectTrigger aria-label="Change stage status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="same">
              No change{currentStatus ? ` (${STATUS_LABEL[currentStatus]})` : ""}
            </SelectItem>
            {STAGE_STATUSES.filter((value) => value !== currentStatus).map((value) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[value]}`} />
                  Mark as {STATUS_LABEL[value].toLowerCase()}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="neo-inset flex items-center gap-3 rounded-xl px-3 py-2.5"
          >
            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
            <button
              type="button"
              aria-label="Remove attachment"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="nofile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip /> Attach a file (optional)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileTap={{ scale: canPost ? 0.97 : 1 }}>
        <Button type="submit" className="w-full" disabled={!canPost}>
          {posting ? <LoaderCircle className="animate-spin" /> : <Send />}{" "}
          {posting ? "Posting…" : "Post update"}
        </Button>
      </motion.div>
      {!author && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Tip: pick your name so the team knows who posted
        </p>
      )}
    </form>
  );
}

function Timeline({
  loading,
  updates,
  drawingLabel,
  revisionOf,
  onOpen,
  onDownload,
  onDelete,
}: {
  loading: boolean;
  updates: StageUpdate[];
  drawingLabel: string;
  revisionOf: (update: StageUpdate) => number;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
  onDelete: (update: StageUpdate) => Promise<void>;
}) {
  const [pendingDelete, setPendingDelete] = useState<StageUpdate | null>(null);

  return (
    <section className="neo-surface rounded-3xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
          <History className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Updates &amp; remarks</h2>
          <p className="text-xs text-muted-foreground">Latest first</p>
        </div>
        <span className="neo-pressed rounded-full px-3 py-1 text-xs font-bold text-primary">
          {updates.length}
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-inset grid place-items-center rounded-2xl px-6 py-14 text-center"
        >
          <CircleDot className="h-8 w-8 text-primary/60" />
          <div className="mt-3 font-semibold text-foreground">No updates yet</div>
          <div className="mt-1 max-w-xs text-sm text-muted-foreground">
            {drawingLabel
              ? `Upload the ${drawingLabel} or post the first remark.`
              : "Post the first update."}{" "}
            Every update will appear here, newest on top.
          </div>
        </motion.div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-primary/40 before:to-transparent">
          <AnimatePresence initial={true}>
            {updates.map((update, index) => (
              <motion.li
                key={update.id}
                layout
                initial={{ opacity: 0, y: -18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                transition={{ duration: 0.45, ease: EASE, delay: Math.min(index, 8) * 0.05 }}
                className="relative flex gap-4"
              >
                <span
                  className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30" : "neo-pop text-primary"}`}
                >
                  {initials(update.author)}
                </span>
                <UpdateCard
                  update={update}
                  latest={index === 0}
                  drawingLabel={drawingLabel}
                  revision={update.kind === "sld" ? revisionOf(update) : -1}
                  onOpen={onOpen}
                  onDownload={onDownload}
                  onDelete={() => setPendingDelete(update)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "sld"
                ? `This removes this ${drawingLabel} revision and its file. The previous revision becomes the current drawing.`
                : "This removes the update and any attached file. The stage status is not changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (pendingDelete) void onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function UpdateCard({
  update,
  latest,
  drawingLabel,
  revision,
  onOpen,
  onDownload,
  onDelete,
}: {
  update: StageUpdate;
  latest: boolean;
  drawingLabel: string;
  revision: number;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
  onDelete: () => void;
}) {
  const isDrawing = update.kind === "sld";
  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group/card neo-pop min-w-0 flex-1 rounded-2xl p-4 ${latest ? "ring-1 ring-primary/25" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-foreground">{update.author || "Unknown"}</span>
        <span className="text-xs text-muted-foreground" title={formatStamp(update.createdAt)}>
          {timeAgo(update.createdAt)}
        </span>
        {latest && (
          <span className="rounded-full bg-gradient-to-r from-primary to-chart-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Latest
          </span>
        )}
        <button
          type="button"
          aria-label="Delete update"
          title="Delete update"
          onClick={onDelete}
          className="ml-auto rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/card:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {(isDrawing || update.status) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {isDrawing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <UploadCloud className="h-3 w-3" />
              {revision > 0
                ? `${drawingLabel} revised · R${revision}`
                : `${drawingLabel} uploaded · R0`}
            </span>
          )}
          {update.status && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[update.status]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[update.status]}`} />
              Status → {STATUS_LABEL[update.status]}
            </span>
          )}
        </div>
      )}

      {update.remarks && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
          {update.remarks}
        </p>
      )}

      {update.storagePath && (
        <div className="neo-inset mt-3 flex items-center gap-3 rounded-xl px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{update.fileName}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {formatSize(update.fileSize)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Open ${update.fileName}`}
            title="Open"
            onClick={() => onOpen(update)}
          >
            <ExternalLink />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Download ${update.fileName}`}
            title="Download"
            onClick={() => onDownload(update)}
          >
            <Download />
          </Button>
        </div>
      )}
    </motion.article>
  );
}
