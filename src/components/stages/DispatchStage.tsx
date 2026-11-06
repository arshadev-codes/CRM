import { EditLock, EditOnly, useStageCanEdit } from "./stageAccess";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Trash2,
  Truck,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import {
  DISPATCH_CHECKLIST,
  formatLongDate,
  LOADING_METHODS,
  MILESTONES,
  PACKING_TYPES,
  relativeDay,
  todayIso,
  TRANSPORT_MODES,
  type DispatchRow,
  type Milestone,
} from "@/lib/qa";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUCKET, type StageBodyProps } from "./DesignStage";
import { EASE, formatSize, safeName, timeAgo } from "./shared";
import { DispatchPlanDialog, planDispatch } from "./qa/DispatchPlanDialog";
import { IdentityGate } from "./pdi/IdentityGate";
import { PdiReports } from "./pdi/PdiReports";
import { PdiWizard } from "./pdi/PdiWizard";
import {
  fullName,
  loadIdentity,
  saveIdentity,
  type DispatchIdentity,
  type PdiRow,
} from "@/lib/pdi";

type DispatchPatch = Database["public"]["Tables"]["dispatch_details"]["Update"];
type DocRow = Database["public"]["Tables"]["stage_updates"]["Row"];

export function DispatchStage({
  orderId,
  stageName,
  stage,
  setStageStatus,
  author,
  employees,
  onAuthor,
}: StageBodyProps) {
  const canEdit = useStageCanEdit();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<DispatchRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [planning, setPlanning] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const updateOrder = useProposalStore((s) => s.updateInwardOrder);
  const order = useProposalStore((s) => s.inwardOrders.find((item) => item.id === orderId));
  const [identity, setIdentity] = useState<DispatchIdentity | null>(null);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [reports, setReports] = useState<PdiRow[]>([]);
  // The PDI being filled: a draft to continue, or null for a new panel.
  const [wizard, setWizard] = useState<{ key: number; report: PdiRow | null } | null>(null);

  useEffect(() => {
    setIdentity(loadIdentity());
    setIdentityChecked(true);
  }, []);

  const upsertReport = useCallback((row: PdiRow) => {
    setReports((current) =>
      current.some((item) => item.id === row.id)
        ? current.map((item) => (item.id === row.id ? row : item))
        : [...current, row],
    );
  }, []);

  useEffect(() => {
    let active = true;
    void supabase
      .from("pdi_reports")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("created_at")
      .then(({ data }) => {
        if (active) setReports(data ?? []);
      });
    const channel = supabase
      .channel(`pdi-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pdi_reports",
          filter: `inward_order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = (payload.old as Partial<PdiRow>).id;
            if (removed) setReports((current) => current.filter((item) => item.id !== removed));
          } else upsertReport(payload.new as PdiRow);
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId, upsertReport]);

  async function deleteReport(report: PdiRow) {
    const { error } = await supabase.from("pdi_reports").delete().eq("id", report.id);
    if (error) {
      toast.error("Could not delete the draft");
      return;
    }
    setReports((current) => current.filter((item) => item.id !== report.id));
    toast.success("Draft deleted");
  }

  function signOut() {
    saveIdentity(null);
    setIdentity(null);
    setWizard(null);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("dispatch_details").select("*").eq("inward_order_id", orderId).maybeSingle(),
      supabase
        .from("stage_updates")
        .select("*")
        .eq("inward_order_id", orderId)
        .eq("stage_name", stageName)
        .not("storage_path", "is", null)
        .order("created_at", { ascending: false }),
    ]).then(([detailResult, docResult]) => {
      if (!active) return;
      setDetails(detailResult.data ?? null);
      setDocs(docResult.data ?? []);
      setLoading(false);
    });
    const channel = supabase
      .channel(`dispatch-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispatch_details",
          filter: `inward_order_id=eq.${orderId}`,
        },
        (p) => {
          if (p.eventType !== "DELETE") setDetails(p.new as DispatchRow);
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId, stageName]);

  const save = useCallback(
    async (patch: DispatchPatch) => {
      const { data, error } = await supabase
        .from("dispatch_details")
        .upsert({ ...patch, inward_order_id: orderId }, { onConflict: "inward_order_id" })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Could not save");
        return null;
      }
      setDetails(data);
      setSavedAt(Date.now());
      return data;
    },
    [orderId],
  );

  async function advance(next: Milestone) {
    // A panel is packed only after its pre-dispatch inspection is submitted.
    if (next === "packed" && !reports.some((report) => report.status === "submitted")) {
      toast.error("Submit the PDI checklist before marking the dispatch packed");
      document.getElementById("pdi")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const today = todayIso();
    const patch: DispatchPatch = { milestone: next };
    if (next === "packed" && !details?.packing_date) patch.packing_date = today;
    if (next === "in transit" && !details?.dispatched_on) patch.dispatched_on = today;
    if (next === "delivered" && !details?.delivered_on) patch.delivered_on = today;
    const saved = await save(patch);
    if (!saved) return;
    if (stage?.status === "not started") await setStageStatus("in progress");
    if (next === "in transit") {
      if (saved.dispatched_on) updateOrder(orderId, { dispatchDate: saved.dispatched_on });
      await setStageStatus("done");
      toast.success("Dispatched! The Dispatch stage is marked done.");
    } else if (next === "delivered") {
      toast.success("Delivered at site");
    } else {
      toast.success(`Marked ${MILESTONES.find((m) => m.key === next)?.label.toLowerCase()}`);
    }
  }

  if (loading || !identityChecked)
    return (
      <div className="mx-auto w-full max-w-[80vw] space-y-4 max-lg:max-w-full">
        <div className="h-56 animate-pulse" />
        <div className="h-72 animate-pulse" />
      </div>
    );

  const planned = Boolean(details?.planned_date);
  const milestone = (details?.milestone ?? "planned") as Milestone;
  const step = MILESTONES.findIndex((m) => m.key === milestone);
  const next = MILESTONES[step + 1];
  const checklist = (details?.checklist ?? {}) as Record<string, boolean>;

  // View-only users can look at dispatch without the inspector sign-in.
  if (!identity && canEdit)
    return (
      <IdentityGate
        employees={employees}
        defaultName={author}
        onVerified={(verified) => {
          saveIdentity(verified);
          setIdentity(verified);
          onAuthor(fullName(verified));
        }}
      />
    );

  const signedIn = identity && (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 py-1 pl-1 pr-3 font-medium text-emerald-800">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        {fullName(identity)} · {identity.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="font-semibold text-primary hover:underline"
      >
        Not you?
      </button>
    </div>
  );

  if (wizard && identity) {
    const lastSerial =
      [...reports].reverse().find((report) => report.panel_serial)?.panel_serial ?? "";
    return (
      <div className="mx-auto w-full max-w-[80vw] space-y-4 max-lg:max-w-full">
        {signedIn}
        <PdiWizard
          key={wizard.key}
          orderId={orderId}
          identity={identity}
          report={wizard.report}
          defaults={{ customer: order?.customerName ?? "", project: order?.projectNumber ?? "" }}
          previousSerial={lastSerial}
          readinessDate={order?.readinessDate ?? ""}
          onReadinessToday={() => {
            updateOrder(orderId, { readinessDate: todayIso() });
            toast.success("Readiness date set to today");
          }}
          onClose={() => setWizard(null)}
          onSaved={upsertReport}
          onAnother={() => setWizard({ key: Date.now(), report: null })}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full">
      {signedIn}
      <PdiReports
        reports={reports}
        onStart={() => setWizard({ key: Date.now(), report: null })}
        onContinue={(report) => setWizard({ key: Date.now(), report })}
        onDelete={(report) => void deleteReport(report)}
        onSaved={upsertReport}
      />
      {!planned ? (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="neo-surface flex flex-col items-center rounded-3xl px-6 py-14 text-center"
        >
          <motion.span
            animate={{ x: [-6, 6, -6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="neo-pop grid h-20 w-20 place-items-center rounded-3xl text-primary"
          >
            <Truck className="h-9 w-9" />
          </motion.span>
          <div className="mt-5 text-xl font-bold text-foreground">Dispatch is not planned yet</div>
          <div className="mt-1 max-w-md text-sm text-muted-foreground">
            It is usually planned when inspection is finished. You can also plan it now.
          </div>
          <EditOnly>
            <Button className="mt-5" onClick={() => setPlanning(true)}>
              <Truck /> Plan dispatch
            </Button>
          </EditOnly>
        </motion.section>
      ) : (
        <MilestoneHero
          details={details!}
          step={step}
          nextLabel={next?.label}
          onAdvance={() => next && void advance(next.key)}
          onBack={() => step > 0 && void save({ milestone: MILESTONES[step - 1].key })}
          onEditPlan={() => setPlanning(true)}
        />
      )}

      {planned && (
        <>
          <div className="flex items-center justify-end text-xs text-muted-foreground">
            <AnimatePresence>
              {savedAt && (
                <motion.span
                  key={savedAt}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-emerald-600"
                >
                  <Check className="h-3 w-3" /> Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <EditLock>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              icon={Package}
              title="Packing"
              hint="How the bench is crated"
              delay={0.1}
              done={step >= 1}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DField
                  label="Packing date"
                  type="date"
                  value={details?.packing_date}
                  onSave={(v) => save({ packing_date: v || null })}
                />
                <DSelect
                  label="Packing type"
                  value={details?.packing_type}
                  options={PACKING_TYPES}
                  onSave={(v) => save({ packing_type: v })}
                />
                <DField
                  label="No. of packages"
                  type="number"
                  value={details?.packages_count?.toString()}
                  onSave={(v) =>
                    save({ packages_count: v ? Math.max(0, Math.round(Number(v))) : null })
                  }
                />
                <DField
                  label="Gross weight (kg)"
                  type="number"
                  value={details?.gross_weight_kg?.toString()}
                  onSave={(v) => save({ gross_weight_kg: v ? Math.max(0, Number(v)) : null })}
                />
                <DField
                  label="Dimensions (L × W × H)"
                  value={details?.dimensions}
                  placeholder="e.g. 3.2 × 1.8 × 2.1 m"
                  onSave={(v) => save({ dimensions: v })}
                />
                <DSelect
                  label="Loading method"
                  value={details?.loading_method}
                  options={LOADING_METHODS}
                  onSave={(v) => save({ loading_method: v })}
                />
              </div>
            </Panel>

            <Panel
              icon={Truck}
              title="Transport"
              hint="Vehicle, transporter and papers"
              delay={0.14}
              done={step >= 3}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <DSelect
                    label="Mode of transport"
                    value={details?.transport_mode}
                    options={TRANSPORT_MODES}
                    onSave={(v) => save({ transport_mode: v })}
                  />
                </div>
                <DField
                  label="Transporter"
                  value={details?.transporter}
                  onSave={(v) => save({ transporter: v })}
                />
                <DField
                  label="Vehicle no."
                  value={details?.vehicle_no}
                  placeholder="MH 12 AB 1234"
                  onSave={(v) => save({ vehicle_no: v.toUpperCase() })}
                />
                <DField
                  label="Driver name"
                  value={details?.driver_name}
                  onSave={(v) => save({ driver_name: v })}
                />
                <DField
                  label="Driver phone"
                  type="tel"
                  value={details?.driver_phone}
                  onSave={(v) => save({ driver_phone: v })}
                />
                <DField
                  label="LR / consignment no."
                  value={details?.lr_number}
                  onSave={(v) => save({ lr_number: v })}
                />
                <DField
                  label="E-way bill no."
                  value={details?.eway_bill_no}
                  onSave={(v) => save({ eway_bill_no: v })}
                />
                <DField
                  label="Invoice no."
                  value={details?.invoice_no}
                  onSave={(v) => save({ invoice_no: v })}
                />
                <DField
                  label="Transit insurance"
                  value={details?.insurance}
                  placeholder="Policy no. / by customer"
                  onSave={(v) => save({ insurance: v })}
                />
                <DField
                  label="Dispatched on"
                  type="date"
                  value={details?.dispatched_on}
                  onSave={(v) => save({ dispatched_on: v || null })}
                />
              </div>
            </Panel>

            <Panel
              icon={MapPin}
              title="Destination & delivery"
              hint="Where it goes and who receives it"
              delay={0.18}
              done={step >= 4}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <DField
                    label="Delivery address"
                    multiline
                    value={details?.destination}
                    onSave={(v) => save({ destination: v })}
                  />
                </div>
                <DField
                  label="Site contact"
                  value={details?.site_contact}
                  onSave={(v) => save({ site_contact: v })}
                />
                <DField
                  label="Site phone"
                  type="tel"
                  value={details?.site_phone}
                  onSave={(v) => save({ site_phone: v })}
                />
                <DField
                  label="Expected delivery"
                  type="date"
                  value={details?.expected_delivery}
                  onSave={(v) => save({ expected_delivery: v || null })}
                />
                <DField
                  label="Delivered on"
                  type="date"
                  value={details?.delivered_on}
                  onSave={(v) => save({ delivered_on: v || null })}
                />
                <DField
                  label="Received by"
                  value={details?.received_by}
                  onSave={(v) => save({ received_by: v })}
                />
                <div className="sm:col-span-2">
                  <DField
                    label="Delivery remarks / damage"
                    multiline
                    value={details?.delivery_remarks}
                    placeholder="Condition on arrival, shortages, damages…"
                    onSave={(v) => save({ delivery_remarks: v })}
                  />
                </div>
              </div>
            </Panel>

            <Checklist
              checklist={checklist}
              onToggle={(key) => void save({ checklist: { ...checklist, [key]: !checklist[key] } })}
            />
          </div>
          </EditLock>

          <Documents
            orderId={orderId}
            stageName={stageName}
            author={author}
            docs={docs}
            setDocs={setDocs}
          />

          <Panel
            icon={Pencil}
            title="Notes"
            hint="Anything else for the dispatch team"
            delay={0.26}
          >
            <EditLock>
            <DField
              label=""
              multiline
              value={details?.notes}
              placeholder="Special handling, permits, escort, unloading at site…"
              onSave={(v) => save({ notes: v })}
            />
            </EditLock>
          </Panel>
        </>
      )}

      <DispatchPlanDialog
        key={planning ? "open" : "closed"}
        open={planning}
        title={planned ? "Change dispatch plan" : "Plan the dispatch"}
        description="Set the dispatch date and who is in charge of packing and dispatch."
        employees={employees}
        defaultDate={details?.planned_date ?? undefined}
        defaultIncharge={details?.incharge || author}
        onClose={() => setPlanning(false)}
        onConfirm={async (date, incharge) => {
          if (await planDispatch(orderId, date, incharge)) {
            const { data } = await supabase
              .from("dispatch_details")
              .select("*")
              .eq("inward_order_id", orderId)
              .maybeSingle();
            if (data) setDetails(data);
            if (stage?.status === "not started") await setStageStatus("in progress");
            setPlanning(false);
            toast.success("Dispatch plan saved");
          }
        }}
      />
    </div>
  );
}

function MilestoneHero({
  details,
  step,
  nextLabel,
  onAdvance,
  onBack,
  onEditPlan,
}: {
  details: DispatchRow;
  step: number;
  nextLabel?: string;
  onAdvance: () => void;
  onBack: () => void;
  onEditPlan: () => void;
}) {
  const canEdit = useStageCanEdit();
  const today = todayIso();
  const delivered = details.milestone === "delivered";
  const late = !details.dispatched_on && details.planned_date && details.planned_date < today;
  const pct = (step / (MILESTONES.length - 1)) * 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
      className="neo-surface overflow-hidden rounded-3xl p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {details.dispatched_on ? "Dispatched on" : "Planned dispatch"}
          </div>
          <div className="mt-1 text-3xl font-bold text-foreground">
            {formatLongDate(details.dispatched_on ?? details.planned_date ?? undefined)}
          </div>
          <div className={`mt-1 text-sm font-semibold ${late ? "text-rose-600" : "text-primary"}`}>
            {details.dispatched_on
              ? delivered
                ? `Delivered ${formatLongDate(details.delivered_on ?? undefined)}`
                : details.expected_delivery
                  ? `Expected at site ${relativeDay(details.expected_delivery, today).toLowerCase()}`
                  : "On the way"
              : late
                ? `${relativeDay(details.planned_date ?? undefined, today)}, not dispatched yet`
                : relativeDay(details.planned_date ?? undefined, today)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              In-charge: {details.incharge || "—"}
            </span>
            {details.transport_mode && (
              <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
                {details.transport_mode}
              </span>
            )}
            {details.vehicle_no && (
              <span className="rounded-full bg-muted px-3 py-1 font-mono font-medium text-muted-foreground">
                {details.vehicle_no}
              </span>
            )}
          </div>
        </div>
        <div className={`flex flex-wrap gap-2 ${canEdit ? "" : "hidden"}`}>
          <Button variant="ghost" size="sm" onClick={onEditPlan}>
            <Pencil /> Change plan
          </Button>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Undo step
            </Button>
          )}
          {nextLabel && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={onAdvance}>
                <Check /> Mark {nextLabel.toLowerCase()}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="relative mt-10 px-4 pb-2">
        <div className="neo-inset absolute left-4 right-4 top-[18px] h-2 rounded-full" />
        <motion.div
          className="absolute left-4 top-[18px] h-2 rounded-full bg-gradient-to-r from-primary via-chart-2 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `calc((100% - 2rem) * ${pct / 100})` }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <motion.div
          className="absolute top-[-22px] z-10 -translate-x-1/2 text-primary"
          initial={{ left: "1rem" }}
          animate={{ left: `calc(1rem + (100% - 2rem) * ${pct / 100})` }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          <motion.div
            animate={delivered ? {} : { y: [0, -2, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            {delivered ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            ) : (
              <Truck className="h-7 w-7" />
            )}
          </motion.div>
        </motion.div>
        <div className="relative flex justify-between">
          {MILESTONES.map((m, i) => {
            const reached = i <= step;
            return (
              <div
                key={m.key}
                className="flex w-20 flex-col items-center text-center first:items-start first:text-left last:items-end last:text-right"
              >
                <motion.span
                  initial={{ scale: 0.6 }}
                  animate={{ scale: i === step ? 1.15 : 1 }}
                  className={`relative z-10 grid h-11 w-11 place-items-center rounded-full border-4 border-[var(--neo-bg)] ${reached ? (i === MILESTONES.length - 1 ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground") : "neo-pop text-muted-foreground"}`}
                >
                  {reached && i < step ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </motion.span>
                <span
                  className={`mt-2 text-xs font-semibold ${reached ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {m.label}
                </span>
                <span className="hidden text-[10px] text-muted-foreground sm:block">{m.hint}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  delay,
  done,
  children,
}: {
  icon: typeof Truck;
  title: string;
  hint: string;
  delay: number;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      whileHover={{ y: -2 }}
      className="neo-surface rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${done ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "neo-pop text-primary"}`}
        >
          {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function DField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  multiline,
}: {
  label: string;
  value?: string | null;
  onSave: (value: string) => unknown;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const commit = () => {
    if (draft.trim() !== (value ?? "")) void onSave(draft.trim());
  };
  const id = `d-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs font-semibold text-primary">
          {label}
        </Label>
      )}
      {multiline ? (
        <Textarea
          id={id}
          rows={2}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      )}
    </div>
  );
}

function DSelect({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value?: string | null;
  options: string[];
  onSave: (value: string) => unknown;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-primary">{label}</Label>
      <Select value={value || undefined} onValueChange={(v) => void onSave(v)}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Checklist({
  checklist,
  onToggle,
}: {
  checklist: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const done = DISPATCH_CHECKLIST.filter((c) => checklist[c.key]).length;
  return (
    <Panel
      icon={ClipboardCheck}
      title="Dispatch checklist"
      hint={`${done} of ${DISPATCH_CHECKLIST.length} ready to go with the bench`}
      delay={0.22}
      done={done === DISPATCH_CHECKLIST.length}
    >
      <div className="neo-inset mb-3 h-2 overflow-hidden rounded-full">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          animate={{ width: `${(done / DISPATCH_CHECKLIST.length) * 100}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {DISPATCH_CHECKLIST.map((item) => {
          const checked = Boolean(checklist[item.key]);
          return (
            <motion.button
              key={item.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(item.key)}
              aria-pressed={checked}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-emerald-50 text-emerald-900" : "hover:bg-white/60"}`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"}`}
              >
                <AnimatePresence>
                  {checked && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </Panel>
  );
}

function Documents({
  orderId,
  stageName,
  author,
  docs,
  setDocs,
}: {
  orderId: string;
  stageName: string;
  author: string;
  docs: DocRow[];
  setDocs: Dispatch<SetStateAction<DocRow[]>>;
}) {
  const canEdit = useStageCanEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const images = docs.filter(
      (d) => d.content_type?.startsWith("image/") && d.storage_path && !thumbs[d.id],
    );
    if (!images.length) return;
    void supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        images.map((d) => d.storage_path!),
        3600,
      )
      .then(({ data }) => {
        if (!data) return;
        setThumbs((c) => {
          const next = { ...c };
          images.forEach((d, i) => {
            if (data[i]?.signedUrl) next[d.id] = data[i].signedUrl;
          });
          return next;
        });
      });
  }, [docs, thumbs]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    for (const file of list) {
      const path = `${orderId}/stages/dispatch/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast.error(`Could not upload ${file.name}`);
      } else {
        const { data } = await supabase
          .from("stage_updates")
          .insert({
            inward_order_id: orderId,
            stage_name: stageName,
            kind: "update",
            author,
            remarks: "",
            file_name: file.name,
            storage_path: path,
            content_type: file.type || null,
            file_size: file.size,
          })
          .select("*")
          .single();
        if (data) setDocs((c) => [data, ...c]);
      }
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function open(doc: DocRow) {
    if (!doc.storage_path) return;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300, { download: doc.file_name ?? true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(doc: DocRow) {
    const { error } = await supabase.from("stage_updates").delete().eq("id", doc.id);
    if (error) return toast.error("Could not delete the file");
    if (doc.storage_path) await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    setDocs((c) => c.filter((d) => d.id !== doc.id));
  }

  return (
    <Panel
      icon={Camera}
      title="Photos & documents"
      hint="Packing photos, LR copy, e-way bill, delivery challan…"
      delay={0.24}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          hidden={!canEdit}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 text-sm font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          {uploading ? (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
          {uploading ? `Uploading ${uploading}…` : "Add files"}
        </motion.button>
        <AnimatePresence initial={true}>
          {docs.map((doc, i) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(i, 10) * 0.04 }}
              whileHover={{ y: -3 }}
              className="group/doc relative aspect-[4/3] overflow-hidden rounded-2xl neo-pop"
            >
              {thumbs[doc.id] ? (
                <img
                  src={thumbs[doc.id]}
                  alt={doc.file_name ?? ""}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/doc:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center text-primary">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white">
                <div className="truncate text-xs font-medium">{doc.file_name}</div>
                <div className="text-[10px] text-white/75">
                  {[formatSize(doc.file_size), timeAgo(doc.created_at)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover/doc:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={`Download ${doc.file_name}`}
                  onClick={() => void open(doc)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-foreground shadow"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  hidden={!canEdit}
                  aria-label={`Delete ${doc.file_name}`}
                  onClick={() => void remove(doc)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-destructive shadow"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
