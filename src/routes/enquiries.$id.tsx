import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Mail,
  MailCheck,
  MessageCircle,
  Paperclip,
  Phone,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ShareLink } from "@/components/enquiries/SendFormDialog";
import { useCan } from "@/store/authStore";
import {
  deleteEnquiry,
  ENQUIRY_STATUSES,
  formatWhen,
  formLink,
  openFile,
  statusMeta,
  updateEnquiry,
  useEnquiry,
  whatsappLink,
} from "@/lib/enquiries";
import { summarize } from "@/lib/rfqForm";

export const Route = createFileRoute("/enquiries/$id")({
  head: () => ({ meta: [{ title: "Enquiry — Electrosoft Proposal Engine" }] }),
  component: EnquiryPage,
});

// One client's requirement form: every answer, their files, and where sales has got to with it.
function EnquiryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const canEdit = useCan("quotation");
  const { enquiry: e, loading, reload } = useEnquiry(id);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const markedSeen = useRef(false);

  useEffect(() => {
    if (e) setNotes(e.notes);
  }, [e]);

  // Opening a new enquiry is reading it.
  useEffect(() => {
    if (!e || !canEdit || e.status !== "new" || markedSeen.current) return;
    markedSeen.current = true;
    void updateEnquiry(e.id, { status: "seen" }).then((ok) => {
      if (ok) void reload();
    });
  }, [e, canEdit, reload]);

  if (loading)
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );

  if (!e)
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="neo-surface rounded-3xl py-16 text-center">
          <p className="font-semibold text-slate-700">This enquiry doesn't exist</p>
          <Link
            to="/enquiries"
            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
          >
            Back to enquiries
          </Link>
        </div>
      </div>
    );

  const meta = statusMeta(e.status);
  const waiting = e.status === "invited";

  async function setStatus(status: (typeof ENQUIRY_STATUSES)[number]["key"]) {
    if (await updateEnquiry(id, { status })) {
      toast.success(`Marked "${statusMeta(status).label}"`);
      void reload();
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    const ok = await updateEnquiry(id, { notes });
    setSavingNotes(false);
    if (ok) {
      toast.success("Notes saved");
      void reload();
    }
  }

  async function remove() {
    if (!e) return;
    const what = e.enquiryNo ? `enquiry ${e.enquiryNo}` : "this link";
    if (!confirm(`Delete ${what} from ${e.company}? This can't be undone.`)) return;
    if (await deleteEnquiry(e)) {
      toast.success("Deleted");
      void navigate({ to: "/enquiries" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Link
        to="/enquiries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> All enquiries
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-500">
              {e.enquiryNo ?? "Personal link"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}
            >
              {meta.label}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
            {e.company || "—"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {e.submittedAt
              ? `Received ${formatWhen(e.submittedAt)}${e.source === "personal" ? " · from a personal link" : ""}`
              : `Link sent ${formatWhen(e.invitedAt)} · not filled yet`}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          {waiting ? (
            <div className="neo-surface rounded-2xl p-5">
              <h2 className="font-semibold text-slate-800">Waiting for the client</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                The client hasn't filled the form yet. Send the link again if needed.
              </p>
              <ShareLink link={formLink(e.token)} phone={e.phone} name={e.contactPerson} />
            </div>
          ) : (
            summarize(e.answers).map((s) => (
              <section key={s.title} className="neo-surface rounded-2xl p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-900/80">
                  {s.title}
                </h2>
                <dl className="divide-y divide-slate-300/40 text-sm">
                  {s.rows.map((r) => (
                    <div
                      key={r.label}
                      className="grid gap-0.5 py-2 sm:grid-cols-[2fr_3fr] sm:gap-4"
                    >
                      <dt className="text-slate-500">{r.label}</dt>
                      <dd className="whitespace-pre-line font-medium text-slate-800">
                        {r.value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="neo-surface space-y-2.5 rounded-2xl p-5 text-sm">
            <h2 className="mb-1 font-semibold text-slate-800">Client</h2>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 shrink-0 text-slate-400" /> {e.contactPerson || "—"}
            </div>
            {e.email && (
              <a
                href={`mailto:${e.email}`}
                className="flex items-center gap-2 break-all text-indigo-600 hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {e.email}
              </a>
            )}
            {e.phone && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  href={`tel:${e.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-indigo-600 hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {e.phone}
                </a>
                <a
                  href={`https://wa.me/${e.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
            )}
            {e.submittedAt &&
              (e.emailSentAt ? (
                <p className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <MailCheck className="h-3.5 w-3.5" /> Office emailed {formatWhen(e.emailSentAt)}
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    The office email was not sent{e.emailError ? `: ${e.emailError}` : "."}{" "}
                    Everything is saved here.
                  </span>
                </p>
              ))}
          </div>

          {!waiting && (
            <div className="neo-surface rounded-2xl p-5">
              <h2 className="mb-2 font-semibold text-slate-800">Files</h2>
              {e.files.length === 0 ? (
                <p className="text-sm text-slate-400">No files attached.</p>
              ) : (
                <ul className="space-y-1.5">
                  {e.files.map((f) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => openFile(f)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-left text-sm text-slate-700 hover:text-indigo-700"
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <Download className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!waiting && (
            <div className="neo-surface rounded-2xl p-5">
              <h2 className="mb-2 font-semibold text-slate-800">Status</h2>
              <div className="flex flex-wrap gap-1.5">
                {ENQUIRY_STATUSES.filter((s) => s.key !== "invited").map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={!canEdit || e.status === s.key}
                    onClick={() => setStatus(s.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-default ${
                      e.status === s.key
                        ? `${s.chip} ring-1 ring-current`
                        : "cursor-pointer bg-white/60 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="neo-surface rounded-2xl p-5">
            <h2 className="mb-2 font-semibold text-slate-800">Notes</h2>
            <Textarea
              rows={4}
              value={notes}
              disabled={!canEdit}
              placeholder="Calls, follow-ups, what the client said…"
              onChange={(ev) => setNotes(ev.target.value)}
            />
            {canEdit && (
              <Button
                size="sm"
                className="mt-3"
                onClick={saveNotes}
                disabled={savingNotes || notes === e.notes}
              >
                <Save /> Save notes
              </Button>
            )}
          </div>

          {canEdit && (
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={remove}>
              <Trash2 /> Delete {e.enquiryNo ? "enquiry" : "link"}
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
