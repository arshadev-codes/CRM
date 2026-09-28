import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, Check, Download, FileText, LoaderCircle, Pencil, Trash2, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useProposalStore, type InwardOrder } from "@/store/proposalStore";
import { supabase } from "@/integrations/supabase/client";
import { loadStages, stagePageSlug, stageProgress, type Stage } from "@/lib/stages";
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
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

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

const STATUS_STYLES: Record<InwardOrder["status"], string> = {
  Open: "bg-primary/10 text-primary",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

function formatDate(value?: string | number) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

function DetailField({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-primary">{label}</div>
      {badge ? (
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLES[value as InwardOrder["status"]] ?? "bg-muted text-muted-foreground"}`}>
          {value}
        </span>
      ) : <div className="text-base font-medium text-foreground break-words">{value || "—"}</div>}
    </div>
  );
}

function InwardOrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrateOrders = useProposalStore((s) => s.hydrateInwardOrders);
  const updateOrder = useProposalStore((s) => s.updateInwardOrder);
  const deleteOrder = useProposalStore((s) => s.deleteInwardOrder);
  const order = orders.find((item) => item.id === id);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    if (!files?.length) return;
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

  if (!order && loading) return <div className="grid min-h-[50vh] place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!order) return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <div className="neo-surface rounded-2xl p-10"><h1 className="text-xl font-semibold">Inward order not found</h1><Button asChild variant="outline" className="mt-5"><Link to="/inward-orders">Back to Inward Orders</Link></Button></div>
    </div>
  );

  const fields = [
    ["Created", formatDate(order.createdAt)], ["Project Number", order.projectNumber],
    ["Customer Name", order.customerName], ["Project Name", order.projectName],
    ["Purchase Order Number", order.poNumber], ["Date of Purchase Order", formatDate(order.poDate)],
    ["Due Date", formatDate(order.dueDate)], ["Supervisor", order.supervisor],
    ["QA Officer", order.qaOfficer], ["Date of Readiness", formatDate(order.readinessDate)],
    ["Inspection Date", formatDate(order.inspectionDate)], ["Dispatch Date", formatDate(order.dispatchDate)],
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex items-center gap-3">
        <Button asChild size="icon" variant="outline" aria-label="Back to Inward Orders"><Link to="/inward-orders"><ArrowLeft /></Link></Button>
        <div><h1 className="text-2xl font-bold text-foreground sm:text-3xl">Inward Orders</h1><p className="mt-1 text-sm text-muted-foreground">{order.projectNumber}</p></div>
        <div className="ml-auto flex gap-2">
          <Button size="icon" variant="outline" aria-label="Edit inward order" title="Edit inward order" onClick={() => setEditOpen(true)}><Pencil /></Button>
          <Button size="icon" variant="destructive" aria-label="Delete inward order" title="Delete inward order" onClick={() => setDeleteOpen(true)}><Trash2 /></Button>
        </div>
      </header>

      <section className="neo-surface rounded-2xl bg-card p-6 sm:p-8">
        <div className="space-y-7">{fields.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}<DetailField label="Status" value={order.status} badge /></div>
      </section>

      <section className="mt-6 neo-surface rounded-2xl bg-card p-6 sm:p-8">
        <div className="mb-2 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">Project progress</h2><p className="mt-1 text-sm text-muted-foreground">{doneCount} of 7 stages complete</p></div><div className="text-xl font-bold text-primary">{progress}% Complete</div></div>
        <div className="h-3 overflow-hidden rounded-full bg-muted shadow-inner" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Project completion">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-9 overflow-x-auto pb-2">
          <div className="flex min-w-[760px] items-start">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex flex-1 items-start">
                <button type="button" className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center" onClick={() => { const slug = stagePageSlug(stage.stageName); if (slug) void navigate({ to: "/inward-orders/$id/stages/$stage", params: { id, stage: slug } }); else setSelectedStage(stage); }}>
                  <span className={`grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-bold transition-transform group-hover:scale-105 ${stage.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : stage.status === "in progress" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/35 bg-card text-muted-foreground"}`}>
                    {stage.status === "done" ? <Check className="h-5 w-5" /> : index + 1}
                  </span>
                  <span className="text-xs font-medium leading-tight text-foreground">{stage.stageName}</span>
                </button>
                {index < stages.length - 1 && <div className={`mt-5 h-0.5 flex-1 ${stage.status === "done" ? "bg-emerald-500" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 neo-surface rounded-2xl bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">Attachments</h2><p className="mt-1 text-sm text-muted-foreground">Files related to this inward order</p></div><Button variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}Upload files</Button><input ref={inputRef} className="hidden" type="file" multiple onChange={(event) => void uploadFiles(event.target.files)} /></div>
        <div className="mt-5 space-y-3">
          {attachments.length === 0 ? <div className="neo-inset rounded-xl py-8 text-center text-sm text-muted-foreground">No attachments uploaded</div> : attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 rounded-xl bg-muted/45 px-4 py-3"><FileText className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-foreground">{attachment.fileName}</div><div className="text-xs text-muted-foreground">{attachment.fileSize ? `${Math.max(1, Math.round(attachment.fileSize / 1024))} KB` : "File"}</div></div><Button size="icon" variant="ghost" aria-label={`Download ${attachment.fileName}`} title="Download" onClick={() => void downloadAttachment(attachment)}><Download /></Button></div>
          ))}
        </div>
      </section>

      <EditOrderDialog order={order} open={editOpen} onOpenChange={setEditOpen} onSave={(patch) => { updateOrder(order.id, patch); setEditOpen(false); toast.success("Inward order updated"); }} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this inward order?</AlertDialogTitle><AlertDialogDescription>This removes the inward order, its stages, and attachment records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteOrder(order.id); void navigate({ to: "/inward-orders" }); toast.success("Inward order deleted"); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <StageSheet stage={selectedStage} onOpenChange={(open) => { if (!open) setSelectedStage(null); }} />
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

function StageSheet({ stage, onOpenChange }: { stage: Stage | null; onOpenChange: (open: boolean) => void }) {
  return <Sheet open={Boolean(stage)} onOpenChange={onOpenChange}><SheetContent className="w-full sm:max-w-md"><SheetHeader><SheetTitle>{stage?.stageName ?? "Stage"}</SheetTitle><SheetDescription>Current stage information</SheetDescription></SheetHeader>{stage && <div className="mt-8 space-y-7"><DetailField label="Status" value={stage.status.replace(/^./, (letter) => letter.toUpperCase())} /><DetailField label="Assigned to" value={stage.assignedTo} /><DetailField label="Expected date" value={formatDate(stage.expectedDate)} /><DetailField label="Remarks" value={stage.remarks} /></div>}</SheetContent></Sheet>;
}