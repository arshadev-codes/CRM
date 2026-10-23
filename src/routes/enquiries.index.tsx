import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  Inbox,
  Mail,
  Paperclip,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/StatTile";
import { ViewOnlyBadge } from "@/components/auth/Can";
import { SendFormDialog } from "@/components/enquiries/SendFormDialog";
import { useCan } from "@/store/authStore";
import {
  copyText,
  ENQUIRY_STATUSES,
  formatWhen,
  formLink,
  statusMeta,
  useEnquiries,
  type Enquiry,
  type EnquiryStatus,
} from "@/lib/enquiries";

export const Route = createFileRoute("/enquiries/")({
  head: () => ({ meta: [{ title: "Enquiries — Electrosoft Proposal Engine" }] }),
  component: EnquiriesPage,
});

type Filter = "all" | EnquiryStatus;

const SYSTEM_SHORT: Record<string, string> = {
  advanced: "Fully Automatic",
  conventional: "Conventional",
};

// Requirement forms from clients, newest first. The first step before a quotation.
function EnquiriesPage() {
  const canEdit = useCan("quotation");
  const { enquiries, loading, reload } = useEnquiries();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);

  const count = (s: EnquiryStatus) => enquiries.filter((e) => e.status === s).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enquiries.filter(
      (e) =>
        (filter === "all" || e.status === filter) &&
        (!q ||
          [e.company, e.contactPerson, e.email, e.phone, e.enquiryNo ?? ""].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [enquiries, filter, query]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Enquiries</h1>
            <ViewOnlyBadge perm="quotation" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Requirement forms filled by clients. Share the common form link, or send a client a link
            of their own.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copyText(formLink(), "Form link")}>
            <Copy /> Copy form link
          </Button>
          {canEdit && (
            <Button onClick={() => setSending(true)}>
              <Send /> Send form to a client
            </Button>
          )}
        </div>
      </div>
      <SendFormDialog open={sending} onOpenChange={setSending} onCreated={reload} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Sparkles}
          label="New"
          value={count("new")}
          tone="text-rose-600 bg-rose-50"
          active={filter === "new"}
          onClick={() => setFilter("new")}
        />
        <StatTile
          icon={Mail}
          label="Link sent, not filled yet"
          value={count("invited")}
          tone="text-sky-600 bg-sky-50"
          active={filter === "invited"}
          onClick={() => setFilter("invited")}
        />
        <StatTile
          icon={Inbox}
          label="Seen"
          value={count("seen")}
          tone="text-amber-600 bg-amber-50"
          active={filter === "seen"}
          onClick={() => setFilter("seen")}
        />
        <StatTile
          icon={CheckCircle2}
          label="Quotation done"
          value={count("quoted")}
          tone="text-emerald-600 bg-emerald-50"
          active={filter === "quoted"}
          onClick={() => setFilter("quoted")}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="neo-inset flex min-w-0 flex-1 basis-56 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            data-no-neo
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search company, contact, email, phone or enquiry no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="neo-inset flex flex-wrap rounded-xl p-1 text-xs font-medium">
          {(["all", ...ENQUIRY_STATUSES.map((s) => s.key)] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {f === "all" ? "All" : statusMeta(f).label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="neo-surface rounded-3xl px-6 py-20 text-center">
          <Inbox className="mx-auto mb-3 h-12 w-12 text-indigo-300" />
          <p className="font-semibold text-slate-700">No enquiries yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            When a client fills the requirement form, it appears here and the office gets an email.
            Copy the form link above to share it.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="neo-surface rounded-3xl py-16 text-center text-sm text-slate-500">
          No enquiries match this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((e) => (
            <EnquiryRow key={e.id} enquiry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EnquiryRow({ enquiry: e }: { enquiry: Enquiry }) {
  const meta = statusMeta(e.status);
  const systems = e.answers.systemTypes
    .map((k) => SYSTEM_SHORT[k])
    .filter(Boolean)
    .join(" + ");
  const { ratingMin, ratingMinUnit, ratingMax, ratingMaxUnit } = e.answers;
  const range =
    ratingMin && ratingMax ? `${ratingMin} ${ratingMinUnit} – ${ratingMax} ${ratingMaxUnit}` : "";
  return (
    <li>
      <Link
        to="/enquiries/$id"
        params={{ id: e.id }}
        className="group neo-surface flex items-center gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-500">
              {e.enquiryNo ?? "Personal link"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}
            >
              {meta.label}
            </span>
            {e.files.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Paperclip className="h-3 w-3" /> {e.files.length}
              </span>
            )}
            {e.submittedAt && !e.emailSentAt && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Email not sent
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-semibold text-slate-800 group-hover:text-indigo-700">
            {e.company || "—"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {[e.contactPerson, e.phone, systems, range].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="hidden shrink-0 text-right text-xs text-slate-400 sm:block">
          {e.submittedAt ? "Received" : "Link sent"}
          <div className="font-medium text-slate-600">
            {formatWhen(e.submittedAt ?? e.invitedAt)}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500" />
      </Link>
    </li>
  );
}
