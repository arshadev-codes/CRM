import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Download,
  LoaderCircle,
  MailCheck,
  RotateCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { downloadDccPdf, emailDcc, issueDcc } from "@/lib/dcc";
import type { PdiRow } from "@/lib/pdi";
import { Button } from "@/components/ui/button";
import { useStageCanEdit } from "../stageAccess";
import { timeAgo } from "../shared";

type Mail = { state: "idle" | "sending" | "sent" | "failed"; error?: string };

// The panel's Dispatch Clearance Code, with its email status and the PDF.
export function DccPanel({
  report,
  onSaved,
  autoSend,
}: {
  report: PdiRow;
  onSaved: (row: PdiRow) => void;
  autoSend?: boolean;
}) {
  const canEdit = useStageCanEdit();
  const [row, setRow] = useState(report);
  const [local, setLocal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mail, setMail] = useState<Mail>({ state: report.dcc_emailed_at ? "sent" : "idle" });
  const started = useRef(false);

  useEffect(() => setRow(report), [report]);

  function update(next: PdiRow) {
    setRow(next);
    onSaved(next);
  }

  async function send(target: PdiRow) {
    setMail({ state: "sending" });
    const result = await emailDcc(target);
    if (result.ok) {
      setMail({ state: "sent" });
      update({ ...target, dcc_emailed_at: result.emailedAt });
    } else setMail({ state: "failed", error: result.error });
  }

  async function issue() {
    setIssuing(true);
    const { dcc, local: isLocal } = await issueDcc(row);
    setIssuing(false);
    setLocal(isLocal);
    const next = { ...row, dcc };
    update(next);
    if (!isLocal) await send(next);
  }

  // Right after submit: get the code and email it once.
  useEffect(() => {
    if (!autoSend || started.current) return;
    started.current = true;
    if (!row.dcc) void issue();
    else if (!row.dcc_emailed_at) void send(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  async function download() {
    setDownloading(true);
    try {
      await downloadDccPdf(row);
    } catch {
      toast.error("Could not make the PDF");
    }
    setDownloading(false);
  }

  if (!row.dcc)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {issuing ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" /> Generating DCC…
          </>
        ) : (
          <>
            <span className="flex-1">This panel has no DCC yet.</span>
            {canEdit && (
              <Button size="sm" onClick={() => void issue()}>
                Generate DCC
              </Button>
            )}
          </>
        )}
      </div>
    );

  return (
    <div className="w-full rounded-2xl bg-primary/[0.06] p-4 text-left ring-1 ring-primary/20">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Dispatch clearance code
          </div>
          <div className="font-mono text-2xl font-bold tracking-wider text-primary">{row.dcc}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Copy DCC"
          onClick={() =>
            void navigator.clipboard
              .writeText(row.dcc ?? "")
              .then(() => toast.success("DCC copied"))
              .catch(() => undefined)
          }
        >
          <Copy />
        </Button>
        <Button size="sm" variant="outline" onClick={() => void download()} disabled={downloading}>
          {downloading ? <LoaderCircle className="animate-spin" /> : <Download />} PDF
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {local ? (
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Demo mode: this code is saved only in this
            browser and is not emailed. Download the PDF instead.
          </span>
        ) : mail.state === "sending" ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Emailing the report…
          </span>
        ) : mail.state === "sent" || row.dcc_emailed_at ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <MailCheck className="h-3.5 w-3.5" /> Emailed to the dispatch inbox
            {row.dcc_emailed_at ? `, ${timeAgo(row.dcc_emailed_at)}` : ""}
          </span>
        ) : mail.state === "failed" ? (
          <span className="inline-flex items-center gap-1.5 text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Email not sent: {mail.error}
          </span>
        ) : (
          <span className="text-muted-foreground">Not emailed yet</span>
        )}
        {!local && canEdit && mail.state !== "sending" && (
          <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => void send(row)}>
            {row.dcc_emailed_at ? <RotateCw /> : <Send />}
            {row.dcc_emailed_at ? "Send again" : "Send email"}
          </Button>
        )}
      </div>
    </div>
  );
}
