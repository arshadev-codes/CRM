import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/electrosoft-logo.png";
import {
  formatLongDate,
  KIND_META,
  mapPoint,
  mapSession,
  mapTest,
  POINT_META,
  sessionTitle,
  TEST_STATUS_META,
  WITNESS_META,
  type MomPoint,
  type QaSession,
  type TestItem,
} from "@/lib/qa";

export const Route = createFileRoute("/print/mom/$sessionId")({
  head: () => ({
    meta: [
      { title: "Minutes of Meeting — Electrosoft" },
      { name: "description", content: "Printable minutes of a testing or inspection session." },
    ],
  }),
  component: PrintMom,
});

type OrderInfo = {
  project_number: string | null;
  customer_name: string | null;
  project_name: string | null;
  po_number: string | null;
};

function PrintMom() {
  const { sessionId } = Route.useParams();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [session, setSession] = useState<QaSession | null>(null);
  const [points, setPoints] = useState<MomPoint[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [order, setOrder] = useState<OrderInfo | null>(null);

  useEffect(() => {
    async function load() {
      const { data: row } = await supabase
        .from("qa_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (!row) {
        setState("missing");
        return;
      }
      const [pointResult, testResult, orderResult] = await Promise.all([
        supabase.from("mom_points").select("*").eq("session_id", sessionId).order("display_order"),
        supabase.from("test_items").select("*").eq("session_id", sessionId).order("display_order"),
        supabase
          .from("inward_orders")
          .select("project_number, customer_name, project_name, po_number")
          .eq("id", row.inward_order_id)
          .maybeSingle(),
      ]);
      setSession(mapSession(row));
      setPoints((pointResult.data ?? []).map(mapPoint));
      setTests((testResult.data ?? []).map(mapTest));
      setOrder((orderResult.data as OrderInfo | null) ?? null);
      setState("ready");
    }
    void load();
  }, [sessionId]);

  if (state === "loading")
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Preparing minutes…</div>;
  if (state === "missing" || !session)
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Session not found.</div>;

  const showClients = session.kind !== "testing";
  const cell = "border border-slate-300 px-2 py-1.5 align-top";

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:bg-white print:py-0">
      <div className="print:hidden fixed bottom-6 right-6 z-50 flex gap-2">
        <button
          type="button"
          onClick={() => window.close()}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg"
        >
          <X className="h-4 w-4" /> Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <article className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[14mm] print:min-h-0 text-[11px] leading-relaxed text-slate-900 shadow-xl print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-blue-700 pb-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Electrosoft" className="h-10 w-auto" />
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tracking-wide text-blue-800">MINUTES OF MEETING</div>
            <div className="text-xs font-semibold text-slate-600">
              {KIND_META[session.kind].label}
            </div>
          </div>
        </header>

        <table className="mt-4 w-full border-collapse">
          <tbody>
            <tr>
              <td className={`${cell} w-[22%] bg-slate-50 font-semibold`}>Customer</td>
              <td className={cell}>{order?.customer_name || "—"}</td>
              <td className={`${cell} w-[18%] bg-slate-50 font-semibold`}>Project no.</td>
              <td className={cell}>{order?.project_number || "—"}</td>
            </tr>
            <tr>
              <td className={`${cell} bg-slate-50 font-semibold`}>Project</td>
              <td className={cell}>{order?.project_name || "—"}</td>
              <td className={`${cell} bg-slate-50 font-semibold`}>PO no.</td>
              <td className={cell}>{order?.po_number || "—"}</td>
            </tr>
            <tr>
              <td className={`${cell} bg-slate-50 font-semibold`}>Meeting</td>
              <td className={cell}>{sessionTitle(session)}</td>
              <td className={`${cell} bg-slate-50 font-semibold`}>Date &amp; time</td>
              <td className={cell}>
                {formatLongDate(session.date)}
                {session.time ? `, ${session.time}` : ""}
              </td>
            </tr>
            <tr>
              <td className={`${cell} bg-slate-50 font-semibold`}>Venue</td>
              <td className={cell} colSpan={3}>
                {session.location || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <h2 className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-800">Attendees</h2>
        <table className="mt-1.5 w-full border-collapse">
          <thead>
            <tr className="bg-blue-50 text-left">
              <th className={cell}>Name</th>
              <th className={cell}>Designation / role</th>
              <th className={cell}>Organisation</th>
              <th className={cell}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {session.team.map((m, i) => (
              <tr key={`t${i}`}>
                <td className={cell}>{m.name}</td>
                <td className={cell}>{m.role}</td>
                <td className={cell}>Electrosoft</td>
                <td className={cell} />
              </tr>
            ))}
            {showClients &&
              session.clients.map((c, i) => (
                <tr key={`c${i}`}>
                  <td className={cell}>{c.name}</td>
                  <td className={cell}>{c.designation}</td>
                  <td className={cell}>{c.company || order?.customer_name}</td>
                  <td className={cell}>{c.phone}</td>
                </tr>
              ))}
            {!session.team.length && !session.clients.length && (
              <tr>
                <td className={cell} colSpan={4}>
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {tests.length > 0 && (
          <>
            <h2 className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-800">
              Tests covered
            </h2>
            <table className="mt-1.5 w-full border-collapse">
              <thead>
                <tr className="bg-blue-50 text-left">
                  <th className={`${cell} w-8`}>#</th>
                  <th className={cell}>Test</th>
                  <th className={`${cell} w-24`}>Result</th>
                  {showClients && <th className={`${cell} w-24`}>Client</th>}
                  <th className={cell}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, i) => (
                  <tr key={t.id}>
                    <td className={cell}>{i + 1}</td>
                    <td className={cell}>{t.title}</td>
                    <td className={`${cell} font-semibold`}>{TEST_STATUS_META[t.status].label}</td>
                    {showClients && (
                      <td className={cell}>{t.witness ? WITNESS_META[t.witness].label : "—"}</td>
                    )}
                    <td className={cell}>
                      {[t.notes, t.witnessRemarks].filter(Boolean).join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-800">
          Points discussed
        </h2>
        <table className="mt-1.5 w-full border-collapse">
          <thead>
            <tr className="bg-blue-50 text-left">
              <th className={`${cell} w-8`}>#</th>
              <th className={`${cell} w-24`}>Type</th>
              <th className={cell}>Discussion / observation</th>
              <th className={cell}>Action agreed</th>
              <th className={`${cell} w-24`}>Responsibility</th>
              <th className={`${cell} w-20`}>Target</th>
              <th className={`${cell} w-14`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.id} className="break-inside-avoid">
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{POINT_META[p.type].label}</td>
                <td className={cell}>
                  {p.description}
                  {p.cause && <div className="mt-1 text-slate-600">Cause: {p.cause}</div>}
                </td>
                <td className={cell}>{p.action}</td>
                <td className={cell}>{p.owner}</td>
                <td className={cell}>{p.dueDate ? formatLongDate(p.dueDate) : ""}</td>
                <td className={`${cell} font-semibold`}>
                  {p.status === "closed" ? "Closed" : "Open"}
                </td>
              </tr>
            ))}
            {!points.length && (
              <tr>
                <td className={cell} colSpan={7}>
                  No points recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {session.summary && (
          <>
            <h2 className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-800">
              Summary
            </h2>
            <p className="mt-1 whitespace-pre-wrap">{session.summary}</p>
          </>
        )}

        <div className={`mt-14 grid gap-10 ${showClients ? "grid-cols-2" : "grid-cols-1 w-1/2"}`}>
          <div>
            <div className="h-12 border-b border-slate-500" />
            <div className="mt-1 font-semibold">For Electrosoft</div>
            <div className="text-slate-600">Name, signature &amp; date</div>
          </div>
          {showClients && (
            <div>
              <div className="h-12 border-b border-slate-500" />
              <div className="mt-1 font-semibold">For {order?.customer_name || "the client"}</div>
              <div className="text-slate-600">Name, signature &amp; date</div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
