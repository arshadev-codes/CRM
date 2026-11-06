// Emails a submitted PDI report (with its DCC) to the fixed dispatch inbox.
//
// The browser builds the PDF and sends it here; this function checks the DCC really was
// issued, then mails it through Resend. Secrets (set with `npx supabase secrets set`):
//   RESEND_API_KEY   key from resend.com
//   DCC_EMAIL_TO     the Gmail address that receives every DCC
//   DCC_EMAIL_FROM   optional, e.g. "Electrosoft Dispatch <dispatch@yourdomain.com>"
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function escape(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("DCC_EMAIL_TO");
  const from = Deno.env.get("DCC_EMAIL_FROM") || "Electrosoft Dispatch <onboarding@resend.dev>";
  if (!apiKey || !to)
    return reply({ error: "Email is not set up (RESEND_API_KEY / DCC_EMAIL_TO)" }, 500);

  type Report = Record<string, string | null | undefined>;
  let input: { dcc?: string; pdfBase64?: string; fileName?: string; report?: Report };
  try {
    input = await req.json();
  } catch {
    return reply({ error: "Bad request" }, 400);
  }
  const { dcc, pdfBase64, fileName } = input;
  if (!dcc || !pdfBase64) return reply({ error: "dcc and pdfBase64 are required" }, 400);
  if (pdfBase64.length > 8_000_000) return reply({ error: "PDF is too large" }, 413);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only signed-in, active staff may send.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: caller } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!caller?.user) return reply({ error: "Please sign in again." }, 401);
  const { data: staff } = await db
    .from("profiles")
    .select("active")
    .eq("id", caller.user.id)
    .maybeSingle();
  if (!staff?.active) return reply({ error: "Your account can't send email." }, 403);
  const { data: entry } = await db
    .from("dcc_registry")
    .select("dcc, pdi_report_id")
    .eq("dcc", dcc)
    .maybeSingle();
  if (!entry) return reply({ error: "Unknown DCC" }, 404);

  const { data: saved } = await db
    .from("pdi_reports")
    .select("*")
    .eq("id", entry.pdi_report_id)
    .maybeSingle();
  // The app may still keep reports in the browser (demo mode); then use what it sent.
  const report: Report | null = saved ?? input.report ?? null;

  const rows: [string, unknown][] = [
    ["DCC", dcc],
    ["Project", report?.project_number],
    ["Customer", report?.customer_name],
    ["Panel", [report?.panel_serial, report?.panel_name].filter(Boolean).join(" · ")],
    ["Inspected by", `${report?.inspector_name ?? ""} (${report?.inspector_email ?? ""})`],
    ["Submitted", report?.submitted_at ? new Date(report.submitted_at).toUTCString() : ""],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a">
      <h2 style="margin:0 0 4px">Dispatch clearance: ${escape(dcc)}</h2>
      <p style="margin:0 0 16px;color:#475569">The pre-dispatch inspection is submitted. The full report is attached.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="color:#64748b">${escape(label)}</td><td><b>${escape(value)}</b></td></tr>`,
          )
          .join("")}
      </table>
    </div>`;

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject:
        `${dcc} · ${report?.project_number ?? ""} · Panel ${report?.panel_serial ?? ""}`.trim(),
      html,
      attachments: [{ filename: fileName || `${dcc}.pdf`, content: pdfBase64 }],
    }),
  });

  if (!sent.ok) {
    const error = (await sent.text()).slice(0, 500);
    await db.from("dcc_registry").update({ email_error: error }).eq("dcc", dcc);
    return reply({ error: "Email could not be sent", detail: error }, 502);
  }

  const now = new Date().toISOString();
  await db.from("dcc_registry").update({ emailed_at: now, email_error: null }).eq("dcc", dcc);
  await db.from("pdi_reports").update({ dcc_emailed_at: now }).eq("id", entry.pdi_report_id);
  return reply({ ok: true, emailedAt: now });
});
