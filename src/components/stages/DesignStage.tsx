import { useProposalStore } from "@/store/proposalStore";
import { notify } from "@/store/notificationStore";
import { EditOnly, useStageCanEdit } from "./stageAccess";
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
  FilePlus2,
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
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BomPanel } from "./BomPanel";
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
export type StageUpdate = {
  id: string;
  kind: "update" | "sld" | "bom";
  author: string;
  remarks: string;
  title: string;
  documentId?: string;
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
    kind: row.kind === "sld" || row.kind === "bom" ? row.kind : "update",
    author: row.author,
    remarks: row.remarks,
    title: row.title ?? "",
    documentId: row.document_id ?? undefined,
    status: (row.status as StageStatus | null) ?? undefined,
    fileName: row.file_name ?? undefined,
    storagePath: row.storage_path ?? undefined,
    contentType: row.content_type ?? undefined,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

// Drawings uploaded before documents had titles share this key and read as one document.
const LEGACY_DOCUMENT = "legacy";
const BOM_GROUP = "bom";

export type DesignDocument = {
  id: string;
  title: string;
  // Oldest first, so the index is the revision number.
  revisions: StageUpdate[];
};

function groupKey(update: StageUpdate) {
  if (update.kind === "bom") return BOM_GROUP;
  return update.documentId ?? LEGACY_DOCUMENT;
}

function isPdf(update: { fileName?: string; contentType?: string }) {
  return (
    update.contentType === "application/pdf" ||
    Boolean(update.fileName?.toLowerCase().endsWith(".pdf"))
  );
}

const TITLE_SUGGESTIONS = [
  "Single Line Diagram",
  "GA Drawing",
  "Wiring Diagram",
  "Control Schematic",
  "Panel Layout",
  "Cable Schedule",
];

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

type UploadIntent = { file: File; mode: "new" | "revision"; documentId?: string };

// Design: the design documents (SLD and any others) and the BOM up top, then remarks and
// updates, newest first. Stages without documents (Fabrication, Production) use the feed alone.
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
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [intent, setIntent] = useState<UploadIntent | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState(0);

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

  // Revisions of every document and of the BOM, oldest first.
  const groups = useMemo(() => {
    const map = new Map<string, StageUpdate[]>();
    for (const update of [...updates].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (update.kind === "update" || !update.storagePath) continue;
      const key = groupKey(update);
      map.set(key, [...(map.get(key) ?? []), update]);
    }
    return map;
  }, [updates]);

  const documents = useMemo<DesignDocument[]>(
    () =>
      [...groups.entries()]
        .filter(([key]) => key !== BOM_GROUP)
        .map(([key, revisions]) => ({
          id: key,
          title:
            revisions.find((item) => item.title)?.title ||
            (key === LEGACY_DOCUMENT ? drawingTitle || drawingLabel : "Document"),
          revisions,
        }))
        .sort((a, b) => a.revisions[0].createdAt.localeCompare(b.revisions[0].createdAt)),
    [groups, drawingTitle, drawingLabel],
  );
  const bomRevisions = groups.get(BOM_GROUP) ?? [];
  const currentDoc = documents.find((doc) => doc.id === selectedDoc) ?? documents[0];

  const revisionOf = useCallback(
    (update: StageUpdate) =>
      (groups.get(groupKey(update)) ?? []).findIndex((item) => item.id === update.id),
    [groups],
  );
  const titleOf = useCallback(
    (update: StageUpdate) =>
      update.kind === "bom"
        ? "BOM"
        : (documents.find((doc) => doc.id === groupKey(update))?.title ?? drawingLabel),
    [documents, drawingLabel],
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

  // Stores a file as a new document, a new revision of one, or a BOM revision.
  async function saveFile(
    file: File,
    values: { kind: "sld" | "bom"; title: string; documentId: string | null; remarks: string },
  ) {
    const storagePath = await uploadFile(file, values.kind === "bom" ? "bom" : "drawings");
    if (!storagePath) {
      toast.error(`Could not upload ${file.name}`);
      return null;
    }
    const startsStage = stage?.status === "not started";
    const rowId = crypto.randomUUID();
    const update = await insertUpdate({
      id: rowId,
      kind: values.kind,
      author,
      remarks: values.remarks,
      title: values.title,
      // A new document is identified by its first revision.
      document_id: values.documentId ?? (values.kind === "sld" ? rowId : null),
      file_name: file.name,
      storage_path: storagePath,
      content_type:
        file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : null),
      file_size: file.size,
      status: startsStage ? "in progress" : null,
    });
    if (!update) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      toast.error(`Could not save ${file.name}`);
      return null;
    }
    if (startsStage) await setStageStatus("in progress");
    return update;
  }

  async function uploadDocument(values: {
    file: File;
    mode: "new" | "revision";
    documentId?: string;
    title: string;
    remarks: string;
  }) {
    const doc = documents.find((item) => item.id === values.documentId);
    setUploading(values.file.name);
    const update = await saveFile(values.file, {
      kind: "sld",
      title: values.mode === "new" ? values.title : (doc?.title ?? values.title),
      documentId: values.mode === "revision" && doc && doc.id !== LEGACY_DOCUMENT ? doc.id : null,
      remarks: values.remarks,
    });
    setUploading(null);
    if (!update) return false;
    const key = groupKey(update);
    setSelectedDoc(key);
    setUploadedAt(Date.now());
    const what =
      values.mode === "new"
        ? `${values.title} uploaded`
        : `${doc?.title ?? drawingLabel} R${doc?.revisions.length ?? 0} uploaded`;
    toast.success(what);
    const order = useProposalStore.getState().inwardOrders.find((o) => o.id === id);
    notify({
      kind: "design",
      title: values.mode === "new" ? "New design document" : "Design changed",
      body: `${order?.projectNumber ?? "Order"}: ${what}${values.remarks ? `. ${values.remarks}` : ""}${author ? ` (by ${author})` : ""}`,
      link: `/inward-orders/${id}/stages/design`,
      audience: ["production", "fabrication", "bom"],
    });
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

  // Removes every revision of a design document and their files.
  async function deleteDocument(doc: DesignDocument) {
    const ids = doc.revisions.map((item) => item.id);
    const { error } = await supabase.from("stage_updates").delete().in("id", ids);
    if (error) {
      toast.error("Could not delete the document");
      return;
    }
    const paths = doc.revisions.flatMap((item) => (item.storagePath ? [item.storagePath] : []));
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    setUpdates((current) => current.filter((item) => !ids.includes(item.id)));
    toast.success(`${doc.title} deleted`);
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
        <>
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mx-auto w-full max-w-[80vw] max-lg:max-w-full"
          >
            <DocumentsPanel
              label={drawingLabel}
              title={drawingTitle}
              loading={loading}
              documents={documents}
              current={currentDoc}
              onSelect={setSelectedDoc}
              uploading={uploading}
              uploadedAt={uploadedAt}
              onPick={setIntent}
              onOpen={(update) => void openFile(update, false)}
              onDownload={(update) => void openFile(update, true)}
              onDeleteRevision={deleteUpdate}
              onDeleteDocument={deleteDocument}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
            className="mx-auto mt-8 w-full max-w-[80vw] max-lg:max-w-full"
          >
            <BomPanel
              orderId={id}
              author={author}
              employees={employees}
              onAuthor={onAuthor}
              loading={loading}
              revisions={bomRevisions}
              onSaveFile={(file, remarks) =>
                saveFile(file, {
                  kind: "bom",
                  title: "Bill of Materials",
                  documentId: null,
                  remarks,
                })
              }
              onOpen={(update) => void openFile(update, false)}
              onDownload={(update) => void openFile(update, true)}
            />
          </motion.section>

          <DocumentUploadDialog
            key={intent ? `${intent.file.name}-${intent.mode}-${intent.documentId}` : "closed"}
            intent={intent}
            documents={documents}
            author={author}
            employees={employees}
            onAuthor={onAuthor}
            onClose={() => setIntent(null)}
            onSubmit={async (values) => {
              const ok = await uploadDocument(values);
              if (ok) setIntent(null);
              return ok;
            }}
          />
        </>
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
          <EditOnly
            fallback={
              <div className="neo-surface rounded-3xl p-6 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">Updates are view only</div>
                <p className="mt-1">Your account can see this stage's remarks and updates but can't post new ones.</p>
              </div>
            }
          >
            <Composer
              author={author}
              employees={employees}
              onAuthor={onAuthor}
              currentStatus={stage?.status}
              allowFiles={!showDrawing}
              onPost={postUpdate}
            />
          </EditOnly>
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
            titleOf={titleOf}
            onOpen={(update) => void openFile(update, false)}
            onDownload={(update) => void openFile(update, true)}
            onDelete={deleteUpdate}
          />
        </motion.div>
      </div>
    </>
  );
}

function DocumentsPanel({
  label,
  title,
  loading,
  documents,
  current,
  onSelect,
  uploading,
  uploadedAt,
  onPick,
  onOpen,
  onDownload,
  onDeleteRevision,
  onDeleteDocument,
}: {
  label: string;
  title: string;
  loading: boolean;
  documents: DesignDocument[];
  current?: DesignDocument;
  onSelect: (id: string) => void;
  uploading: string | null;
  uploadedAt: number;
  onPick: (intent: UploadIntent) => void;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
  onDeleteRevision: (update: StageUpdate) => Promise<void>;
  onDeleteDocument: (doc: DesignDocument) => Promise<void>;
}) {
  const canEdit = useStageCanEdit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<"new" | "revision">("new");
  const [dragging, setDragging] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const drawing = current?.revisions.at(-1);
  const revision = current ? current.revisions.length - 1 : 0;
  const previewable = drawing ? isPdf(drawing) : false;

  useEffect(() => {
    if (!uploadedAt) return;
    setJustUploaded(true);
    const timer = window.setTimeout(() => setJustUploaded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [uploadedAt]);

  useEffect(() => {
    let active = true;
    setPreviewUrl(null);
    setPageCount(null);
    if (!drawing?.storagePath || !isPdf(drawing)) return;
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(drawing.storagePath, 60 * 60)
      .then(({ data }) => {
        if (active && data?.signedUrl) setPreviewUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [drawing]);

  function choose(mode: "new" | "revision") {
    if (!canEdit) return;
    pendingMode.current = mode;
    inputRef.current?.click();
  }

  function handle(files: FileList | null, mode = pendingMode.current) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file || uploading || !canEdit) return;
    onPick({
      file,
      mode: current ? mode : "new",
      documentId: current?.id,
    });
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
      handle(event.dataTransfer.files, "revision");
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
        className="hidden"
        onChange={(event) => handle(event.target.files)}
      />

      {documents.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="tablist">
            {documents.map((doc) => {
              const active = doc.id === current?.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelect(doc.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${active ? "neo-pressed text-primary" : "neo-pop text-foreground hover:text-primary"}`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="max-w-[220px] truncate font-semibold">{doc.title}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                  >
                    R{doc.revisions.length - 1}
                  </span>
                </button>
              );
            })}
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => choose("new")}
              disabled={Boolean(uploading)}
            >
              <FilePlus2 /> <span className="hidden sm:inline">Add document</span>
            </Button>
          )}
        </div>
      )}

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
          ) : drawing && previewable && previewUrl ? (
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
          ) : drawing && previewable ? (
            <motion.div
              key="signing"
              exit={{ opacity: 0 }}
              className="grid h-full place-items-center"
            >
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : drawing ? (
            <motion.div
              key={`file-${drawing.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center gap-3 text-center"
            >
              <span className="neo-pop grid h-20 w-20 place-items-center rounded-3xl text-primary">
                <FileText className="h-9 w-9" />
              </span>
              <div className="max-w-sm truncate px-4 font-semibold text-foreground">
                {drawing.fileName}
              </div>
              <div className="text-xs text-muted-foreground">
                Preview is shown for PDF files. Open or download to view this file.
              </div>
            </motion.div>
          ) : !canEdit ? (
            <motion.div
              key="empty-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center gap-3 text-center"
            >
              <span className="neo-pop grid h-20 w-20 place-items-center rounded-3xl text-muted-foreground">
                <FileText className="h-9 w-9" />
              </span>
              <span className="font-semibold text-foreground">No design documents yet</span>
              <span className="text-xs text-muted-foreground">They will show here once the designer uploads them.</span>
            </motion.div>
          ) : (
            <motion.button
              key="empty"
              type="button"
              onClick={() => choose("new")}
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
                  Upload design documents
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {title ? `${title} (${label}) and any other drawings` : "Drawings and documents"}{" "}
                  · click or drop a file · give each one a title
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-chart-2 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 group-hover/upload:-translate-y-0.5 group-hover/upload:shadow-xl group-hover/upload:shadow-primary/40">
                <UploadCloud className="h-4 w-4" /> Choose file
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {drawing && !uploading && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/35 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover/panel:pointer-events-auto group-hover/panel:opacity-100 group-focus-within/panel:pointer-events-auto group-focus-within/panel:opacity-100">
            <div className="flex translate-y-3 flex-wrap justify-center gap-2 transition-transform duration-300 group-hover/panel:translate-y-0">
              <Button size="sm" variant="secondary" onClick={() => onOpen(drawing)}>
                <ExternalLink /> Open {previewable ? "full PDF" : "file"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onDownload(drawing)}>
                <Download /> Download
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => choose("revision")}>
                  <RefreshCw /> Upload new revision
                </Button>
              )}
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
                {drawing ? "a new revision or document" : "a document"}
              </motion.div>
            </motion.div>
          )}
          {uploading && <UploadOverlay key="uploading" fileName={uploading} />}
          {justUploaded && <SuccessBurst key="done" />}
        </AnimatePresence>
      </div>

      {drawing && current && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {current.title} · R{revision}
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
          {current.revisions.length > 1 && (
            <span className="flex items-center gap-1" aria-label="Earlier revisions">
              {current.revisions.slice(0, -1).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item)}
                  title={`Open R${index}${item.remarks ? `: ${item.remarks}` : ""}`}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  R{index}
                </button>
              ))}
            </span>
          )}
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => choose("revision")}
                disabled={Boolean(uploading)}
              >
                <RefreshCw /> New revision
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={Boolean(uploading)}
              >
                <Trash2 /> Delete
              </Button>
            </div>
          )}
        </div>
      )}
      <AlertDialog open={confirmDelete && Boolean(current)} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {current?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {current && current.revisions.length > 1
                ? `Delete only the latest revision (R${revision}), so R${revision - 1} becomes current again, or delete the whole document with all ${current.revisions.length} revisions.`
                : "This removes the document and its file."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {current && drawing && current.revisions.length > 1 && (
              <AlertDialogAction
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => void onDeleteRevision(drawing)}
              >
                Delete only R{revision}
              </AlertDialogAction>
            )}
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (current) void onDeleteDocument(current);
              }}
            >
              {current && current.revisions.length > 1 ? "Delete whole document" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {drawing?.remarks && current && current.revisions.length > 1 && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">R{revision} change:</span>{" "}
          {drawing.remarks}
        </p>
      )}
    </div>
  );
}

// A new document needs a title; a new revision of an existing one needs a remark on what changed.
function DocumentUploadDialog({
  intent,
  documents,
  author,
  employees,
  onAuthor,
  onClose,
  onSubmit,
}: {
  intent: UploadIntent | null;
  documents: DesignDocument[];
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
  onClose: () => void;
  onSubmit: (values: {
    file: File;
    mode: "new" | "revision";
    documentId?: string;
    title: string;
    remarks: string;
  }) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"new" | "revision">(intent?.mode ?? "new");
  const [documentId, setDocumentId] = useState(intent?.documentId ?? documents[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const existingTitles = new Set(documents.map((doc) => doc.title.toLowerCase()));
  const titleTaken = mode === "new" && existingTitles.has(title.trim().toLowerCase());
  const doc = documents.find((item) => item.id === documentId);
  const valid =
    Boolean(author) &&
    (mode === "new" ? Boolean(title.trim()) && !titleTaken : Boolean(doc && remarks.trim()));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!intent || !valid || saving) return;
    setSaving(true);
    await onSubmit({
      file: intent.file,
      mode,
      documentId: mode === "revision" ? documentId : undefined,
      title: title.trim(),
      remarks: mode === "revision" ? remarks.trim() : "",
    });
    setSaving(false);
  }

  return (
    <Dialog open={Boolean(intent)} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{mode === "new" ? "Add a document" : "Upload a new revision"}</DialogTitle>
            <DialogDescription>
              {mode === "new"
                ? "Give the document a title. It gets its own tab and revision history."
                : "Say what changed. The remark is saved with this revision."}
            </DialogDescription>
          </DialogHeader>

          {intent && (
            <div className="neo-inset flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Paperclip className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {intent.file.name}
              </span>
              <span className="text-xs text-muted-foreground">{formatSize(intent.file.size)}</span>
            </div>
          )}

          {documents.length > 0 && (
            <div className="neo-inset grid grid-cols-2 gap-1 rounded-xl p-1" role="radiogroup">
              {(["revision", "new"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${mode === value ? "neo-pop text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {value === "revision" ? "New revision" : "New document"}
                </button>
              ))}
            </div>
          )}

          {mode === "new" ? (
            <div className="space-y-2">
              <Label htmlFor="doc-title" className="text-xs font-semibold text-primary">
                Document title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Single Line Diagram, GA Drawing"
                aria-invalid={titleTaken}
              />
              {titleTaken && (
                <p className="text-xs text-destructive">
                  A document with this title exists. Upload a new revision of it instead.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {TITLE_SUGGESTIONS.filter((item) => !existingTitles.has(item.toLowerCase())).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTitle(item)}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Document</Label>
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger aria-label="Document">
                    <SelectValue placeholder="Choose the document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title} · now R{item.revisions.length - 1}, this becomes R
                        {item.revisions.length}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rev-remarks" className="text-xs font-semibold text-primary">
                  What changed? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rev-remarks"
                  autoFocus
                  rows={3}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="e.g. Client comments incorporated, incomer rating changed to 630A"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-primary">Uploaded by</Label>
            <Select value={author || undefined} onValueChange={onAuthor}>
              <SelectTrigger
                aria-label="Uploaded by"
                className={author ? "" : "ring-2 ring-amber-300"}
              >
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

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}
              {mode === "new" ? "Upload document" : `Upload R${doc?.revisions.length ?? 1}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  allowFiles = true,
  onPost,
}: {
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
  currentStatus?: StageStatus;
  allowFiles?: boolean;
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
          <p className="text-xs text-muted-foreground">
            {allowFiles
              ? "Remarks, status changes and files"
              : "Remarks and status changes. Upload drawings and the BOM above."}
          </p>
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

      {allowFiles && (
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {!allowFiles ? null : file ? (
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
  titleOf,
  onOpen,
  onDownload,
  onDelete,
}: {
  loading: boolean;
  updates: StageUpdate[];
  drawingLabel: string;
  revisionOf: (update: StageUpdate) => number;
  titleOf: (update: StageUpdate) => string;
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
              ? "Upload a design document or the BOM, or post the first remark."
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
                  title={titleOf(update)}
                  revision={update.kind === "update" ? -1 : revisionOf(update)}
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
                ? `This removes this ${pendingDelete ? titleOf(pendingDelete) : drawingLabel} revision and its file. The previous revision becomes the current one.`
                : pendingDelete?.kind === "bom"
                  ? "This removes this BOM revision and its file. Cards already in Material Procurement are kept."
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
  title,
  revision,
  onOpen,
  onDownload,
  onDelete,
}: {
  update: StageUpdate;
  latest: boolean;
  title: string;
  revision: number;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
  onDelete: () => void;
}) {
  const isDrawing = update.kind !== "update";
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
        <EditOnly>
          <button
            type="button"
            aria-label="Delete update"
            title="Delete update"
            onClick={onDelete}
            className="ml-auto rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </EditOnly>
      </div>

      {(isDrawing || update.status) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {isDrawing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <UploadCloud className="h-3 w-3" />
              {revision > 0 ? `${title} revised · R${revision}` : `${title} uploaded · R0`}
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
