import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  AlertTriangle, ArrowLeft, Building2, CalendarCheck, CalendarClock, ClipboardList, Download, File,
  FileArchive, FileImage, FileSpreadsheet, FileText, Hash, LoaderCircle, Pencil, ShieldCheck, Trash2,
  Truck, UploadCloud, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useProposalStore, type InwardOrder } from "@/store/proposalStore";
import { supabase } from "@/lib/db";
import { loadStages, stageProgress, STAGE_NAMES, type Stage } from "@/lib/stages";
import { StageCards } from "@/components/stages/StageCards";
import { PageSkeleton } from "@/components/stages/StageSkeleton";
import { ProgressRing } from "@/components/stages/shared";
import { Avatar } from "@/components/stages/AssigneePicker";
import { Can, ViewOnlyBadge } from "@/components/auth/Can";
import { useCan } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/inward-orders/$id")({
  head: () => ({
    meta: [
      { title: "Inward Order Details — Electrosoft Proposal Engine" },
      { name: "description", content: "View inward order details, delivery stages, progress, and attachments." },
      { property: "og:title", content: "Inward Order Details — Electrosoft Proposal Engine" },
      { property: "og:description", content: "View inward order details, delivery stages, progress, and attachments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InwardOrderDetail,
});

type Attachment = {
  id: string; inwardOrderId: string; fileName: string; storagePath: string;
  contentType?: string; fileSize: number; createdAt: string;
};

const STATUS_META: Record<InwardOrder["status"], { chip: string; accent: string }> = {
  Open: { chip: "bg-indigo-50 text-indigo-700", accent: "from-indigo-500 via-violet-500 to-sky-500" },
  "In Progress": { chip: "bg-amber-50 text-amber-700", accent: "from-amber-400 via-orange-500 to-rose-400" },
  Completed: { chip: "bg-emerald-50 text-emerald-700", accent: "from-emerald-400 via-teal-500 to-sky-500" },
};

function formatDate(value?: string | number) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

function formatSize(bytes: number) {
  if (!bytes) return "File";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Icon and colour by file type, so a list of attachments scans quickly. */
function fileKind(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: FileText, tone: "bg-rose-50 text-rose-600" };
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return { icon: FileImage, tone: "bg-sky-50 text-sky-600" };
  if (["xls", "xlsx", "xlsm", "csv"].includes(ext)) return { icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, tone: "bg-blue-50 text-blue-600" };
  if (["zip", "rar", "7z"].includes(ext)) return { icon: FileArchive, tone: "bg-amber-50 text-amber-600" };
  return { icon: File, tone: "bg-slate-100 text-slate-600" };
}

function InwardOrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrateOrders = useProposalStore((s) => s.hydrateInwardOrders);
  const updateOrder = useProposalStore((s) => s.updateInwardOrder);
  const deleteOrder = useProposalStore((s) => s.deleteInwardOrder);
  const canEdit = useCan("inward_orders");
  const order = orders.find((item) => item.id === id);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { void hydrateOrders(); }, [hydrateOrders]);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      setLoading(true);
      const [stageResult, attachmentResult] = await Promise.all([
        loadStages(id),
        supabase.from("inward_order_attachments").select("*").eq("inward_order_id", id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (stageResult.error) toast.error("Could not load project stages");
      if (attachmentResult.error) toast.error("Could not load attachments");
      setStages(stageResult.stages);
      setAttachments((attachmentResult.data ?? []).map((row) => ({
        id: row.id, inwardOrderId: row.inward_order_id, fileName: row.file_name,
        storagePath: row.storage_path, contentType: row.content_type ?? undefined,
        fileSize: row.file_size, createdAt: row.created_at,
      })));
      setLoading(false);
    }
    void loadDetails();
    return () => { active = false; };
  }, [id]);

  const progress = useMemo(() => stageProgress(stages), [stages]);
  const doneCount = stages.filter((stage) => stage.status === "done").length;

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || !canEdit) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("inward-order-attachments").upload(storagePath, file);
      if (upload.error) { toast.error(`Could not upload ${file.name}`); continue; }
      const record = await supabase.from("inward_order_attachments").insert({
        inward_order_id: id, file_name: file.name, storage_path: storagePath,
        content_type: file.type || null, file_size: file.size,
      }).select("*").single();
      if (record.error || !record.data) { toast.error(`Could not save ${file.name}`); continue; }
      setAttachments((current) => [{
        id: record.data.id, inwardOrderId: record.data.inward_order_id,
        fileName: record.data.file_name, storagePath: record.data.storage_path,
        contentType: record.data.content_type ?? undefined, fileSize: record.data.file_size,
        createdAt: record.data.created_at,
      }, ...current]);
      toast.success(`${file.name} uploaded`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function downloadAttachment(attachment: Attachment) {
    const { data, error } = await supabase.storage.from("inward-order-attachments").createSignedUrl(attachment.storagePath, 60, { download: attachment.fileName });
    if (error || !data?.signedUrl) { toast.error("Could not prepare the download"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!order && loading) return <PageSkeleton tiles={7} />;
  if (!order) return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <div className="neo-surface rounded-3xl p-10">
        <h1 className="text-xl font-semibold">Inward order not found</h1>
        <Button asChild variant="outline" className="mt-5"><Link to="/inward-orders">Back to Inward Orders</Link></Button>
      </div>
    </div>
  );

  const meta = STATUS_META[order.status] ?? STATUS_META.Open;
  const due = order.dueDate && order.status !== "Completed" ? daysUntil(order.dueDate) : undefined;

  const dragProps = canEdit ? {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); },
    onDrop: (e: DragEvent) => { e.preventDefault(); setDragging(false); void uploadFiles(e.dataTransfer.files); },
  } : {};

  const milestones: { label: string; date?: string | number; icon: typeof CalendarCheck }[] = [
    { label: "Order created", date: order.createdAt, icon: ClipboardList },
    { label: "Purchase order", date: order.poDate, icon: Hash },
    { label: "Readiness", date: order.readinessDate, icon: CalendarCheck },
    { label: "Inspection", date: order.inspectionDate, icon: ShieldCheck },
    { label: "Dispatch", date: order.dispatchDate, icon: Truck },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link to="/inward-orders" className="inline-flex items-center gap-1.5 hover:text-indigo-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Inward Orders
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700">{order.projectNumber || "Order"}</span>
      </div>

      {/* Hero */}
      <section className="neo-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${meta.accent}`} />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-2xl" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                {order.projectNumber || "No number"}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${meta.chip}`}>
                {order.status}
              </span>
              {due !== undefined && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${due < 0 ? "bg-rose-100 text-rose-700" : due <= 7 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {due < 0 ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                  {due < 0 ? `${-due} days late` : due === 0 ? "Due today" : `Due in ${due} days`}
                </span>
              )}
              <ViewOnlyBadge perm="inward_orders" />
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              {order.projectName || "Untitled project"}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Building2 className="h-4 w-4" /> {order.customerName || "No customer"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing value={progress} caption={`${doneCount}/${STAGE_NAMES.length} stages done`} />
            <Can perm="inward_orders">
              <div className="flex flex-col gap-2">
                <Button size="icon" variant="outline" aria-label="Edit inward order" title="Edit inward order" onClick={() => setEditOpen(true)}><Pencil /></Button>
                <Button size="icon" variant="outline" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" aria-label="Delete inward order" title="Delete inward order" onClick={() => setDeleteOpen(true)}><Trash2 /></Button>
              </div>
            </Can>
          </div>
        </div>

        {/* Facts */}
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Hash} label="Purchase order" value={order.poNumber || "—"} sub={order.poDate ? `dated ${formatDate(order.poDate)}` : undefined} tone="bg-indigo-50 text-indigo-600" />
          <Fact icon={CalendarClock} label="Due date" value={formatDate(order.dueDate)} tone="bg-rose-50 text-rose-600" />
          <Person label="Supervisor" name={order.supervisor} />
          <Person label="QA officer" name={order.qaOfficer} />
        </div>
      </section>

      {/* Timeline */}
      <section className="neo-surface mt-6 rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-800">Key dates</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-5">
          {milestones.map(({ label, date, icon: Icon }, i) => {
            const set = Boolean(date);
            return (
              <li key={label} className="relative flex items-center gap-3 sm:flex-col sm:items-start">
                {i < milestones.length - 1 && (
                  <span className={`absolute left-5 top-10 hidden h-0.5 w-[calc(100%-1rem)] sm:block ${set ? "bg-gradient-to-r from-indigo-300 to-indigo-100" : "bg-slate-200"}`} />
                )}
                <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${set ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25" : "neo-inset text-slate-400"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                  <span className={`block text-sm font-semibold ${set ? "text-slate-800" : "text-slate-400"}`}>{set ? formatDate(date) : "Not set"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Stages */}
      <section className="neo-surface mt-6 rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Stages</h2>
            <p className="mt-0.5 text-sm text-slate-500">Open a stage to see its work, updates and files.</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>{doneCount} of {STAGE_NAMES.length} done</span>
              <span className="text-indigo-600">{progress}%</span>
            </div>
            <div className="neo-inset mt-1.5 h-2.5 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Project completion">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-teal-400 transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <StageCards orderId={id} stages={stages} />
      </section>

      {/* Attachments */}
      <section
        {...dragProps}
        className={`neo-surface mt-6 rounded-3xl p-6 transition-shadow sm:p-8 ${dragging ? "ring-4 ring-indigo-300" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Attachments</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {attachments.length ? `${attachments.length} file${attachments.length === 1 ? "" : "s"}` : "PO copy, specs and other order files"}
            </p>
          </div>
          <Can perm="inward_orders">
            <Button variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}Upload files
            </Button>
          </Can>
          <input ref={inputRef} className="hidden" type="file" multiple onChange={(event) => void uploadFiles(event.target.files)} />
        </div>

        {attachments.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 px-6 py-10 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><UploadCloud className="h-6 w-6" /></span>
              <span className="font-semibold text-slate-700">Drop files here or click to upload</span>
              <span className="text-xs text-slate-500">PDF, Excel, images. You can pick several at once.</span>
            </button>
          ) : (
            <div className="neo-inset mt-5 rounded-2xl py-8 text-center text-sm text-slate-500">No attachments yet</div>
          )
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {attachments.map((attachment) => {
              const kind = fileKind(attachment.fileName);
              return (
                <li key={attachment.id} className="group flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${kind.tone}`}>
                    <kind.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800" title={attachment.fileName}>{attachment.fileName}</div>
                    <div className="text-xs text-slate-500">{formatSize(attachment.fileSize)} · {formatDate(new Date(attachment.createdAt).getTime())}</div>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Download ${attachment.fileName}`} title="Download" onClick={() => void downloadAttachment(attachment)}><Download /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EditOrderDialog order={order} open={editOpen} onOpenChange={setEditOpen} onSave={(patch) => { updateOrder(order.id, patch); setEditOpen(false); toast.success("Inward order updated"); }} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this inward order?</AlertDialogTitle><AlertDialogDescription>This removes the inward order, its stages, and attachment records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteOrder(order.id); void navigate({ to: "/inward-orders" }); toast.success("Inward order deleted"); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Fact({ icon: Icon, label, value, sub, tone }: { icon: typeof Hash; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/55 px-4 py-3 shadow-sm">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="truncate text-sm font-semibold text-slate-800">{value}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function Person({ label, name }: { label: string; name?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/55 px-4 py-3 shadow-sm">
      {name ? <Avatar name={name} size="md" /> : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400"><Users className="h-5 w-5" /></span>
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="truncate text-sm font-semibold text-slate-800">{name || "Not assigned"}</div>
      </div>
    </div>
  );
}

function EditOrderDialog({ order, open, onOpenChange, onSave }: { order: InwardOrder; open: boolean; onOpenChange: (open: boolean) => void; onSave: (patch: Partial<InwardOrder>) => void }) {
  const [form, setForm] = useState(order);
  useEffect(() => { if (open) setForm(order); }, [open, order]);
  const textFields: Array<[keyof InwardOrder, string, string]> = [
    ["projectNumber", "Project Number", "text"], ["customerName", "Customer Name", "text"], ["projectName", "Project Name", "text"],
    ["poNumber", "Purchase Order Number", "text"], ["poDate", "Date of Purchase Order", "date"], ["dueDate", "Due Date", "date"],
    ["supervisor", "Supervisor", "text"], ["qaOfficer", "QA Officer", "text"], ["readinessDate", "Date of Readiness", "date"],
    ["inspectionDate", "Inspection Date", "date"], ["dispatchDate", "Dispatch Date", "date"],
  ];
  function submit(event: FormEvent) { event.preventDefault(); onSave(form); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Edit inward order</DialogTitle><DialogDescription>Update the order details and current status.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{textFields.map(([key, label, type]) => <div key={key}><Label htmlFor={`edit-${key}`} className="text-xs font-semibold text-primary">{label}</Label><Input id={`edit-${key}`} className="mt-1.5" type={type} value={String(form[key] ?? "")} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></div>)}</div><div><Label className="text-xs font-semibold text-primary">Status</Label><Select value={form.status} onValueChange={(status: InwardOrder["status"]) => setForm((current) => ({ ...current, status }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save changes</Button></DialogFooter></form></DialogContent></Dialog>;
}
