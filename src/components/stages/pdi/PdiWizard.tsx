import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CircuitBoard,
  ClipboardList,
  Cpu,
  FileSignature,
  Hash,
  LoaderCircle,
  PartyPopper,
  Plus,
  Send,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import {
  allOk,
  DECLARATION,
  fullName,
  isAnswered,
  nextSerial,
  PDI_CATEGORIES,
  READINESS_ITEM,
  reportProgress,
  sectionProgress,
  sectionsFor,
  type DispatchIdentity,
  type PdiAnswer,
  type PdiCategory,
  type PdiPatch,
  type PdiResponses,
  type PdiRow,
  type PdiSection,
} from "@/lib/pdi";
import { formatLongDate, todayIso } from "@/lib/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EASE } from "../shared";

const STEPS = [
  { label: "Panel details", icon: Hash },
  { label: "PDI checklist", icon: ClipboardList },
  { label: "Review & submit", icon: FileSignature },
];

type Details = {
  customer: string;
  project: string;
  serial: string;
  panelName: string;
  category: PdiCategory | "";
};

export function PdiWizard({
  orderId,
  identity,
  report,
  defaults,
  previousSerial,
  readinessDate,
  onReadinessToday,
  onClose,
  onSaved,
  onAnother,
}: {
  orderId: string;
  identity: DispatchIdentity;
  report: PdiRow | null;
  defaults: { customer: string; project: string };
  previousSerial: string;
  readinessDate: string;
  onReadinessToday: () => void;
  onClose: () => void;
  onSaved: (row: PdiRow) => void;
  onAnother: () => void;
}) {
  const [step, setStep] = useState(report?.panel_category ? 1 : 0);
  const [reportId, setReportId] = useState(report?.id ?? null);
  const [details, setDetails] = useState<Details>({
    customer: report?.customer_name || defaults.customer,
    project: report?.project_number || defaults.project,
    serial: report?.panel_serial ?? "",
    panelName: report?.panel_name ?? "",
    category: (report?.panel_category as PdiCategory) ?? "",
  });
  const [responses, setResponses] = useState<PdiResponses>(
    (report?.responses as PdiResponses | null) ?? {},
  );
  const [remarks, setRemarks] = useState(report?.remarks ?? "");
  const [declared, setDeclared] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focusSection, setFocusSection] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => sectionsFor(details.category), [details.category]);
  const progress = reportProgress(details.category, responses);
  const suggestedSerial = !details.serial && previousSerial ? nextSerial(previousSerial) : "";
  const detailsValid =
    Boolean(details.serial.trim()) &&
    Boolean(details.project.trim()) &&
    Boolean(details.panelName.trim()) &&
    Boolean(details.category);

  async function save(patch: PdiPatch) {
    setSaving("saving");
    const base = {
      inward_order_id: orderId,
      inspector_name: fullName(identity),
      inspector_email: identity.email,
      email_verified_at: identity.verifiedAt,
    };
    const result = reportId
      ? await supabase.from("pdi_reports").update(patch).eq("id", reportId).select("*").single()
      : await supabase
          .from("pdi_reports")
          .insert({ ...base, ...patch })
          .select("*")
          .single();
    if (result.error || !result.data) {
      setSaving("idle");
      toast.error("Could not save the PDI");
      return null;
    }
    setReportId(result.data.id);
    setSaving("saved");
    onSaved(result.data);
    return result.data;
  }

  // Answers are saved as you go, so nothing is lost if the page closes.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!reportId) return;
    const timer = window.setTimeout(() => void save({ responses, remarks }), 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, remarks]);

  function go(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitDetails() {
    setTouched(true);
    if (!detailsValid) return;
    const saved = await save({
      customer_name: details.customer.trim(),
      project_number: details.project.trim(),
      panel_serial: details.serial.trim(),
      panel_name: details.panelName.trim(),
      panel_category: details.category,
      responses,
    });
    if (saved) go(1);
  }

  async function submit() {
    if (!progress.complete || !declared) return;
    setSubmitting(true);
    const saved = await save({
      responses,
      remarks: remarks.trim(),
      declared: true,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (saved) {
      setDone(true);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function answer(key: string, value: PdiAnswer | undefined) {
    setResponses((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  if (done)
    return (
      <SuccessScreen
        serial={details.serial}
        panelName={details.panelName}
        onAnother={onAnother}
        onClose={onClose}
      />
    );

  return (
    <div ref={topRef} className="mx-auto w-full max-w-6xl scroll-mt-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="neo-surface rounded-[28px]"
      >
        <div className="flex items-center gap-3 border-b border-border/40 px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pre-dispatch inspection
            </div>
            <div className="truncate text-lg font-bold text-foreground">
              {details.serial ? `Panel ${details.serial}` : "New panel"}
              {details.panelName ? ` · ${details.panelName}` : ""}
            </div>
          </div>
          <SaveBadge state={saving} />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close PDI">
            <X />
          </Button>
        </div>

        <div className="mx-auto max-w-2xl">
          <Stepper step={step} onStep={(index) => (index < step || reportId) && go(index)} />
        </div>

        <div className="px-5 pb-6 pt-2 sm:px-7">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-5"
              >
                <div className="neo-inset flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-xs font-bold text-primary-foreground">
                    {identity.firstName[0]}
                    {identity.lastName[0] ?? ""}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold text-foreground">{fullName(identity)}</div>
                    <div className="truncate text-xs text-muted-foreground">{identity.email}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Customer name"
                    value={details.customer}
                    onChange={(customer) => setDetails((d) => ({ ...d, customer }))}
                    hint={
                      details.customer === defaults.customer && defaults.customer
                        ? "From the inward order"
                        : ""
                    }
                  />
                  <Field
                    label="Project number"
                    required
                    value={details.project}
                    invalid={touched && !details.project.trim()}
                    onChange={(project) => setDetails((d) => ({ ...d, project }))}
                    hint={
                      details.project === defaults.project && defaults.project
                        ? "From the inward order"
                        : ""
                    }
                  />
                  <div className="space-y-1.5">
                    <Field
                      label="Panel serial number"
                      required
                      autoFocus={!details.serial}
                      value={details.serial}
                      invalid={touched && !details.serial.trim()}
                      placeholder="e.g. ESP-2410-01"
                      onChange={(serial) => setDetails((d) => ({ ...d, serial }))}
                    />
                    {suggestedSerial && (
                      <button
                        type="button"
                        onClick={() => setDetails((d) => ({ ...d, serial: suggestedSerial }))}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                      >
                        <Plus className="h-3 w-3" /> Next after {previousSerial}:{" "}
                        <span className="font-mono font-bold">{suggestedSerial}</span>
                      </button>
                    )}
                  </div>
                  <Field
                    label="Panel name / description"
                    required
                    value={details.panelName}
                    invalid={touched && !details.panelName.trim()}
                    placeholder="e.g. MCC Panel, PCC-1"
                    onChange={(panelName) => setDetails((d) => ({ ...d, panelName }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-primary">
                    Panel category <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PDI_CATEGORIES.map((option) => {
                      const active = details.category === option.value;
                      const Icon = option.value === "automation" ? Cpu : Zap;
                      return (
                        <motion.button
                          key={option.value}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDetails((d) => ({ ...d, category: option.value }))}
                          aria-pressed={active}
                          className={`relative flex items-center gap-3 rounded-2xl p-4 text-left transition-all ${active ? "bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30" : "neo-pop text-foreground hover:-translate-y-0.5"} ${touched && !details.category ? "ring-2 ring-destructive/40" : ""}`}
                        >
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-white/20" : "bg-primary/10 text-primary"}`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{option.label}</span>
                            <span
                              className={`block text-xs ${active ? "text-white/85" : "text-muted-foreground"}`}
                            >
                              {option.hint}
                              {option.value === "automation" ? " · adds PLC checks" : ""}
                            </span>
                          </span>
                          {active && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="grid h-6 w-6 place-items-center rounded-full bg-white text-primary"
                            >
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </motion.span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {details.category
                      ? `${sectionsFor(details.category).reduce((sum, s) => sum + s.items.length, 0)} checks in ${sectionsFor(details.category).length} sections`
                      : "Automation panels get an extra section of PLC / SCADA checks."}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="checklist"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Checklist
                  sections={sections}
                  responses={responses}
                  focus={focusSection}
                  onAnswer={answer}
                  onAllOk={(section) =>
                    setResponses((current) => ({ ...current, ...allOk(section) }))
                  }
                  readinessDate={readinessDate}
                  onReadinessToday={() => {
                    onReadinessToday();
                    answer(READINESS_ITEM, true);
                  }}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6"
              >
                <div className="space-y-5">
                  <div className="grid gap-2 rounded-2xl bg-gradient-to-br from-primary/10 to-chart-2/10 p-4 text-sm sm:grid-cols-3">
                    <Summary label="Panel" value={`${details.serial} · ${details.panelName}`} />
                    <Summary
                      label="Category"
                      value={PDI_CATEGORIES.find((c) => c.value === details.category)?.label ?? ""}
                    />
                    <Summary label="Project" value={details.project} />
                    <Summary label="Customer" value={details.customer || "—"} />
                    <Summary label="Inspected by" value={fullName(identity)} />
                    <Summary label="Date" value={formatLongDate(todayIso())} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {sections.map((section) => {
                      const p = sectionProgress(section, responses);
                      const na = section.items.filter(
                        (item) => responses[item.key] === "na",
                      ).length;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => {
                            setFocusSection(section.key);
                            go(1);
                          }}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${p.complete ? "neo-pop" : "bg-amber-50 ring-1 ring-amber-200"}`}
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${p.complete ? "bg-emerald-500 text-white" : "bg-amber-200 text-amber-800"}`}
                          >
                            {p.complete ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                              <span className="text-[10px] font-bold">{p.total - p.done}</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {section.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.complete
                              ? na
                                ? `${na} N/A`
                                : "All OK"
                              : `${p.total - p.done} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-5 lg:sticky lg:top-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pdi-remarks" className="text-xs font-semibold text-primary">
                      Remarks (optional)
                    </Label>
                    <Textarea
                      id="pdi-remarks"
                      rows={5}
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Observations, deviations agreed with the client, pending minor points…"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => progress.complete && setDeclared((value) => !value)}
                    disabled={!progress.complete}
                    aria-pressed={declared}
                    className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all ${declared ? "bg-emerald-50 ring-2 ring-emerald-400" : "neo-pop"} ${progress.complete ? "" : "cursor-not-allowed opacity-60"}`}
                  >
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${declared ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"}`}
                    >
                      {declared && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-wider text-primary">
                        Final declaration
                      </span>
                      <span className="mt-1 block text-sm font-medium text-foreground">
                        {DECLARATION}
                      </span>
                      {!progress.complete && (
                        <span className="mt-1 block text-xs text-amber-700">
                          Complete the {progress.total - progress.done} remaining checks first.
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-20 flex items-center gap-3 rounded-b-[28px] border-t border-border/40 bg-[var(--neo-bg)]/90 px-5 py-3 backdrop-blur sm:px-7">
          {step > 0 ? (
            <Button variant="outline" onClick={() => go(step - 1)}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step === 1 && (
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>
                  {progress.done} of {progress.total}
                </span>
                <span>
                  {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="neo-inset mt-1 h-2 overflow-hidden rounded-full">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                  animate={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
            </div>
          )}
          <div className="ml-auto">
            {step === 0 && (
              <Button onClick={() => void submitDetails()} disabled={saving === "saving"}>
                {saving === "saving" ? <LoaderCircle className="animate-spin" /> : null} Next{" "}
                <ArrowRight />
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => go(2)} variant={progress.complete ? "default" : "outline"}>
                Review <ArrowRight />
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => void submit()}
                disabled={!progress.complete || !declared || submitting}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {submitting ? <LoaderCircle className="animate-spin" /> : <Send />} Submit PDI
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Stepper({ step, onStep }: { step: number; onStep: (index: number) => void }) {
  return (
    <div className="px-5 pb-2 pt-5 sm:px-7">
      <div className="relative flex justify-between">
        <div className="absolute left-5 right-5 top-5 h-1 rounded-full bg-muted" />
        <motion.div
          className="absolute left-5 top-5 h-1 rounded-full bg-gradient-to-r from-primary to-chart-2"
          animate={{ width: `calc((100% - 2.5rem) * ${step / (STEPS.length - 1)})` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const reached = index <= step;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onStep(index)}
              className="relative z-10 flex w-24 flex-col items-center gap-1.5 first:items-start last:items-end"
            >
              <motion.span
                animate={{ scale: index === step ? 1.1 : 1 }}
                className={`grid h-11 w-11 place-items-center rounded-full border-4 border-[var(--neo-bg)] ${reached ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "neo-pop text-muted-foreground"}`}
              >
                {index < step ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </motion.span>
              <span
                className={`text-[11px] font-semibold ${index === step ? "text-primary" : reached ? "text-foreground" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Desktop: every section open, with a pinned section list that follows the scroll.
// Small screens get a row of section chips instead of the list.
function Checklist({
  sections,
  responses,
  focus,
  onAnswer,
  onAllOk,
  readinessDate,
  onReadinessToday,
}: {
  sections: PdiSection[];
  responses: PdiResponses;
  focus: string | null;
  onAnswer: (key: string, value: PdiAnswer | undefined) => void;
  onAllOk: (section: PdiSection) => void;
  readinessDate: string;
  onReadinessToday: () => void;
}) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = useState(focus ?? sections[0]?.key ?? "");
  const progress = sections.reduce(
    (sum, section) => {
      const p = sectionProgress(section, responses);
      return { done: sum.done + p.done, total: sum.total + p.total };
    },
    { done: 0, total: 0 },
  );
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const nextOpen = sections.find((section) => !sectionProgress(section, responses).complete);

  function scrollTo(key: string) {
    setActive(key);
    refs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (focus) window.setTimeout(() => scrollTo(focus), 80);
    // Only when the checklist opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight the section being read.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible[0]) setActive((visible[0].target as HTMLElement).dataset.section ?? "");
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const element of Object.values(refs.current)) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-4 space-y-3">
          <div className="neo-inset rounded-2xl p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-foreground">{pct}%</span>
              <span className="text-xs font-medium text-muted-foreground">
                {progress.done} of {progress.total} checks
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </div>
            {nextOpen && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => scrollTo(nextOpen.key)}
              >
                Next unanswered <ArrowRight />
              </Button>
            )}
          </div>
          <nav className="max-h-[calc(100vh-14rem)] space-y-0.5 overflow-y-auto pr-1">
            {sections.map((section, index) => {
              const p = sectionProgress(section, responses);
              const current = active === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => scrollTo(section.key)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${current ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/60"}`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${p.complete ? "bg-emerald-500 text-white" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {p.complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug">
                    {section.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {p.done}/{p.total}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
          {sections.map((section, index) => {
            const p = sectionProgress(section, responses);
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => scrollTo(section.key)}
                title={section.title}
                className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-2 text-xs font-bold ${p.complete ? "bg-emerald-500 text-white" : active === section.key ? "bg-primary text-primary-foreground" : "neo-pop text-muted-foreground"}`}
              >
                {p.complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
              </button>
            );
          })}
        </div>

        {sections.map((section, index) => {
          const p = sectionProgress(section, responses);
          return (
            <section
              key={section.key}
              data-section={section.key}
              ref={(element) => {
                refs.current[section.key] = element;
              }}
              className={`scroll-mt-4 rounded-2xl p-4 transition-shadow sm:p-5 ${p.complete ? "neo-pop" : "neo-surface"} ${active === section.key ? "ring-1 ring-primary/25" : ""}`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${p.complete ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"}`}
                >
                  {p.complete ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : section.plcOnly ? (
                    <CircuitBoard className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {section.title}
                    {section.plcOnly && (
                      <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[9px] font-bold text-violet-700">
                        PLC
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {p.done} of {p.total} {section.kind === "check" ? "ticked" : "answered"}
                    {section.kind === "check" && !p.complete ? " · every box must be ticked" : ""}
                  </div>
                </div>
                {!p.complete && section.kind !== "choice" && (
                  <button
                    type="button"
                    onClick={() => onAllOk(section)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {section.kind === "check" ? "Tick all" : "All Checked OK"}
                  </button>
                )}
              </div>

              {section.kind === "check" ? (
                <div className="grid gap-2 xl:grid-cols-2">
                  {section.items.map((item) => {
                    const value = responses[item.key];
                    return (
                      <div key={item.key}>
                        <CheckRow
                          label={item.label}
                          checked={value === true}
                          onToggle={() => onAnswer(item.key, value === true ? undefined : true)}
                        />
                        {item.key === READINESS_ITEM && (
                          <div className="ml-11 mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            Readiness date:{" "}
                            <span className="font-semibold text-foreground">
                              {readinessDate ? formatLongDate(readinessDate) : "not set"}
                            </span>
                            {readinessDate !== todayIso() && (
                              <button
                                type="button"
                                onClick={onReadinessToday}
                                className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary hover:bg-primary/20"
                              >
                                Set to today & tick
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {section.kind === "matrix" && (
                    <div className="hidden grid-cols-[minmax(0,1fr)_16rem] px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                      <span>Check</span>
                      <span className="grid grid-cols-2 text-center">
                        <span>Checked OK</span>
                        <span>Not applicable</span>
                      </span>
                    </div>
                  )}
                  {section.items.map((item) => {
                    const value = responses[item.key];
                    return (
                      <ChoiceRow
                        key={item.key}
                        label={item.label}
                        value={value}
                        options={
                          section.kind === "matrix"
                            ? [
                                { value: "ok", label: "Checked OK" },
                                { value: "na", label: "N/A" },
                              ]
                            : [
                                { value: "yes", label: "Yes" },
                                { value: "na", label: "Not applicable" },
                              ]
                        }
                        onChange={(next) => onAnswer(item.key, next === value ? undefined : next)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${checked ? "bg-emerald-50 text-foreground" : "neo-inset text-foreground/85 hover:text-foreground"}`}
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/35 bg-white/60"}`}
      >
        <AnimatePresence>
          {checked && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="leading-snug">{label}</span>
    </motion.button>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: PdiAnswer | undefined;
  options: { value: "ok" | "na" | "yes"; label: string }[];
  onChange: (value: "ok" | "na" | "yes") => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 sm:flex-row sm:items-center ${value ? "bg-emerald-50/60" : "neo-inset"}`}
    >
      <span className="flex-1 text-sm leading-snug text-foreground">{label}</span>
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:w-64">
        {options.map((option) => {
          const active = value === option.value;
          const positive = option.value !== "na";
          return (
            <motion.button
              key={option.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${active ? (positive ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-500 text-white shadow-md") : "neo-pop text-muted-foreground hover:text-foreground"}`}
            >
              {active && <Check className="mr-1 inline h-3 w-3" strokeWidth={3} />}
              {option.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  invalid,
  placeholder,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = `pdi-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-primary">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={`h-11 ${invalid ? "ring-2 ring-destructive/40" : ""}`}
      />
      {invalid ? (
        <p className="text-xs text-destructive">Required</p>
      ) : hint ? (
        <p className="text-xs text-emerald-700">{hint}</p>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
      {state === "saving" ? (
        <>
          <LoaderCircle className="h-3 w-3 animate-spin" /> Saving
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-emerald-600" /> Draft saved
        </>
      )}
    </span>
  );
}

function SuccessScreen({
  serial,
  panelName,
  onAnother,
  onClose,
}: {
  serial: string;
  panelName: string;
  onAnother: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="neo-surface relative mx-auto flex w-full max-w-lg flex-col items-center overflow-hidden rounded-[28px] px-6 py-12 text-center"
    >
      {[0, 1, 2].map((ring) => (
        <motion.span
          key={ring}
          className="absolute top-12 h-24 w-24 rounded-full border-2 border-emerald-400"
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 3 + ring, opacity: 0 }}
          transition={{ duration: 1.3, delay: ring * 0.15, ease: "easeOut" }}
        />
      ))}
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40"
      >
        <PartyPopper className="h-11 w-11" />
      </motion.span>
      <div className="mt-6 text-2xl font-bold text-foreground">PDI submitted</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Panel {serial} · {panelName} is inspected and ready for dispatch.
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onAnother}>
          <Plus /> Next panel
        </Button>
        <Button onClick={onClose}>
          Back to dispatch <ArrowRight />
        </Button>
      </div>
    </motion.div>
  );
}
