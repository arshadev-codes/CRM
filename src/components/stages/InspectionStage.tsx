import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  Eye,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  OUTCOME_META,
  sessionsFor,
  setStageStatusByName,
  TEST_STATUS_META,
  todayIso,
  WITNESS_META,
  type Outcome,
  type TestItem,
  type WitnessStatus,
} from "@/lib/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { BUCKET, type StageBodyProps } from "./DesignStage";
import { EASE, safeName } from "./shared";
import { OpenPoints, orderSessions, SessionsBoard } from "./qa/Sessions";
import { useQaData, type QaData } from "./qa/useQaData";
import { DispatchPlanDialog, planDispatch } from "./qa/DispatchPlanDialog";
import { NextSessionCard } from "./TestingStage";

export function InspectionStage({
  orderId,
  stage,
  setStageStatus,
  author,
  employees,
}: StageBodyProps) {
  const qa = useQaData(orderId);
  const [askDispatch, setAskDispatch] = useState(false);
  const [confirmOpenPoints, setConfirmOpenPoints] = useState(false);
  const today = todayIso();
  const sessions = orderSessions(sessionsFor("inspection", qa.sessions), today);
  const nextVisit = sessions.find(
    (s) => s.status !== "completed" && s.status !== "cancelled" && (!s.date || s.date >= today),
  );
  const sessionIds = new Set(sessions.map((s) => s.id));
  const openPoints = qa.points.filter(
    (p) => p.status === "open" && sessionIds.has(p.sessionId),
  ).length;
  const total = qa.tests.length;
  const witnessed = qa.tests.filter(
    (t) => t.witness === "witnessed" || t.witness === "accepted",
  ).length;
  const accepted = qa.tests.filter((t) => t.witness === "accepted").length;
  const rejected = qa.tests.filter((t) => t.witness === "rejected").length;
  const outcome = (qa.outcome?.outcome ?? "") as Outcome;
  const canFinish = outcome === "accepted" || outcome === "accepted_with_remarks";

  async function finish(date: string, incharge: string) {
    if (!(await planDispatch(orderId, date, incharge))) return;
    await setStageStatus("done");
    await setStageStatusByName(orderId, "Dispatch", "in progress");
    setAskDispatch(false);
    toast.success("Inspection done. Dispatch is planned.");
  }

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
        className="neo-surface grid gap-5 rounded-3xl p-5 sm:p-7 lg:grid-cols-[1fr_1fr_320px]"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Client decision
          </div>
          <div className="mt-2">
            {outcome ? (
              <motion.span
                key={outcome}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-lg font-bold ${OUTCOME_META[outcome].chip}`}
              >
                {outcome === "rejected" ? (
                  <X className="h-5 w-5" />
                ) : (
                  <BadgeCheck className="h-5 w-5" />
                )}
                {OUTCOME_META[outcome].label}
              </motion.span>
            ) : (
              <span className="inline-flex rounded-2xl bg-muted px-4 py-2 text-lg font-bold text-muted-foreground">
                Awaiting inspection
              </span>
            )}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {openPoints > 0 ? (
              <span className="font-semibold text-amber-600">
                {openPoints} open point{openPoints === 1 ? "" : "s"} from the client
              </span>
            ) : (
              "No open points"
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Witnessed by client
          </div>
          <div className="mt-1 text-4xl font-bold text-foreground">
            {witnessed}
            <span className="text-lg font-medium text-muted-foreground"> / {total}</span>
          </div>
          <div className="neo-inset mt-3 flex h-3 overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: total ? `${(accepted / total) * 100}%` : 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            />
            <motion.div
              className="h-full bg-violet-500"
              initial={{ width: 0 }}
              animate={{ width: total ? `${((witnessed - accepted) / total) * 100}%` : 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            />
            <motion.div
              className="h-full bg-rose-500"
              initial={{ width: 0 }}
              animate={{ width: total ? `${(rejected / total) * 100}%` : 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {accepted} accepted · {witnessed - accepted} witnessed · {rejected} rejected
          </div>
        </div>
        <NextSessionCard session={nextVisit} today={today} label="Next client visit" />
      </motion.section>

      <OutcomePanel
        qa={qa}
        orderId={orderId}
        author={author}
        stageDone={stage?.status === "done"}
        canFinish={canFinish}
        onFinish={() => (openPoints > 0 ? setConfirmOpenPoints(true) : setAskDispatch(true))}
      />

      <WitnessChecklist qa={qa} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <SessionsBoard page="inspection" qa={qa} employees={employees} author={author} />
        </div>
        <div className="min-w-0">
          <OpenPoints page="inspection" qa={qa} employees={employees} />
        </div>
      </div>

      <AlertDialog open={confirmOpenPoints} onOpenChange={setConfirmOpenPoints}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {openPoints} client point{openPoints === 1 ? " is" : "s are"} still open
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can still finish inspection, and the open points stay listed so they get closed
              before or after dispatch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => setAskDispatch(true)}>
              Finish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DispatchPlanDialog
        open={askDispatch}
        title="Plan the dispatch"
        description="Inspection is complete. When will the test bench be dispatched, and who is in charge?"
        employees={employees}
        confirmLabel="Finish inspection"
        onClose={() => setAskDispatch(false)}
        onConfirm={finish}
      />
    </div>
  );
}

function OutcomePanel({
  qa,
  orderId,
  author,
  stageDone,
  canFinish,
  onFinish,
}: {
  qa: QaData;
  orderId: string;
  author: string;
  stageDone: boolean;
  canFinish: boolean;
  onFinish: () => void;
}) {
  const current = (qa.outcome?.outcome ?? "") as Outcome;
  const [remarks, setRemarks] = useState(qa.outcome?.remarks ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setRemarks(qa.outcome?.remarks ?? ""), [qa.outcome?.remarks]);

  async function choose(outcome: Outcome) {
    const next = current === outcome ? "" : outcome;
    const saved = await qa.saveOutcome({
      outcome: next,
      decided_by: author,
      decided_at: next ? new Date().toISOString() : null,
    });
    if (saved && next)
      toast.success(
        `Inspection marked ${OUTCOME_META[next as Exclude<Outcome, "">].label.toLowerCase()}`,
      );
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    const path = `${orderId}/stages/inspection/report/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || undefined });
    if (error) toast.error("Could not upload the report");
    else {
      await qa.saveOutcome({ report_name: file.name, report_path: path });
      toast.success("Report uploaded");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openReport() {
    if (!qa.outcome?.report_path) return;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(qa.outcome.report_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
      className="neo-surface rounded-3xl p-5 sm:p-6"
    >
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <div className="mb-4 flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-violet-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inspection outcome</h2>
          <p className="text-xs text-muted-foreground">
            The client's final decision after the visits
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(OUTCOME_META) as Exclude<Outcome, "">[]).map((key) => {
          const active = current === key;
          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void choose(key)}
              aria-pressed={active}
              className={`rounded-2xl p-4 text-left transition-all ${active ? `${OUTCOME_META[key].chip} ring-2 ring-black/5 shadow-lg` : "neo-pop"}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {key === "rejected" ? (
                  <X className="h-4 w-4" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                {OUTCOME_META[key].label}
              </div>
              <div className="mt-1 text-xs opacity-75">
                {key === "accepted"
                  ? "Everything approved"
                  : key === "accepted_with_remarks"
                    ? "Approved, with points to close"
                    : "Needs fixes and another visit"}
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <Textarea
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => remarks !== (qa.outcome?.remarks ?? "") && void qa.saveOutcome({ remarks })}
          placeholder="Client's overall remarks, conditions of acceptance…"
        />
        <div className="flex flex-wrap items-start gap-2">
          {qa.outcome?.report_name ? (
            <Button variant="outline" onClick={() => void openReport()}>
              <FileText /> <span className="max-w-[160px] truncate">{qa.outcome.report_name}</span>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}
            {qa.outcome?.report_name ? "Replace report" : "Upload signed report"}
          </Button>
        </div>
      </div>
      {qa.outcome?.decided_by && current && (
        <div className="mt-2 text-xs text-muted-foreground">
          Recorded by {qa.outcome.decided_by}
        </div>
      )}

      <AnimatePresence>
        {canFinish && !stageDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-500 to-primary p-4 text-white shadow-xl shadow-primary/25">
              <Truck className="h-6 w-6" />
              <div className="flex-1">
                <div className="font-bold">Client has accepted</div>
                <div className="text-sm text-white/85">
                  Finish inspection and plan the dispatch.
                </div>
              </div>
              <Button variant="secondary" onClick={onFinish}>
                <Check /> Finish &amp; plan dispatch
              </Button>
            </div>
          </motion.div>
        )}
        {stageDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <Check className="h-4 w-4" /> Inspection is done.
            <Link
              to="/inward-orders/$id/stages/$stage"
              params={{ id: orderId, stage: "dispatch" }}
              className="ml-auto font-semibold text-primary hover:underline"
            >
              Go to Dispatch →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function WitnessChecklist({ qa }: { qa: QaData }) {
  const tests = [...qa.tests].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.16 }}
      className="neo-surface rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-violet-600">
          <Eye className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tests witnessed by the client</h2>
          <p className="text-xs text-muted-foreground">
            Same checklist as Testing, with the client's verdict on each
          </p>
        </div>
      </div>
      {qa.loading ? (
        <div className="h-24 animate-pulse" />
      ) : !tests.length ? (
        <div className="neo-inset rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
          The test checklist is set up on the Testing page.
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {tests.map((test, index) => (
            <WitnessRow key={test.id} test={test} index={index} qa={qa} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function WitnessRow({ test, index, qa }: { test: TestItem; index: number; qa: QaData }) {
  const [remarks, setRemarks] = useState(test.witnessRemarks);
  useEffect(() => setRemarks(test.witnessRemarks), [test.witnessRemarks]);
  const options: Exclude<WitnessStatus, "">[] = ["witnessed", "accepted", "rejected"];
  const tone =
    test.witness === "accepted"
      ? "bg-emerald-50/70"
      : test.witness === "rejected"
        ? "bg-rose-50/80"
        : test.witness === "witnessed"
          ? "bg-violet-50/70"
          : "bg-white/50";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 14) * 0.025 }}
      className={`rounded-2xl p-3 shadow-sm ${tone}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{test.title}</div>
          <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEST_STATUS_META[test.status].chip}`}
          >
            Our test: {TEST_STATUS_META[test.status].label}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          {options.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() =>
                void qa.updateTest(test.id, { witness_status: test.witness === w ? "" : w })
              }
              aria-pressed={test.witness === w}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${test.witness === w ? `${WITNESS_META[w].chip} shadow-sm` : "text-muted-foreground hover:bg-white/80"}`}
            >
              {WITNESS_META[w].label}
            </button>
          ))}
        </div>
      </div>
      {test.witness && (
        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() =>
            remarks !== test.witnessRemarks &&
            void qa.updateTest(test.id, { witness_remarks: remarks })
          }
          placeholder="Client's remark on this test"
          className="mt-2 h-8 text-xs"
        />
      )}
    </motion.div>
  );
}
