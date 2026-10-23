// The public requirement form (RFQ): the only way a client's answers reach the database.
//
// Clients don't sign in, so the browser never writes to the enquiries table itself. It calls
// this function, which checks the answers against the shared form definition, saves them with
// the service role and emails the office. Actions (POST { action, ... }):
//   open   { token }                     personal link → details to fill in, or "already sent"
//   submit { token?, answers, files, website }
//          saves the enquiry. With files it returns one-time upload links and a finish key;
//          without files it emails straight away. "website" is a hidden field only bots fill.
//   finish { id, finishKey }             after the uploads: records the files, sends the email
// Secrets: RESEND_API_KEY, ENQUIRY_EMAIL_TO (falls back to DCC_EMAIL_TO),
//          optional ENQUIRY_EMAIL_FROM (falls back to DCC_EMAIL_FROM) and APP_URL.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  allErrors,
  cleanAnswers,
  fileProblem,
  MAX_FILES,
  summarize,
  type RfqAnswers,
} from "../_shared/rfqForm.ts";

const BUCKET = "enquiry-files";
/** Forms one internet connection may send in an hour. */
const HOURLY_LIMIT = 5;
const APP_URL = (
  Deno.env.get("APP_URL") || "https://electrosoft-crm.electrosoft-crm.workers.dev"
).replace(/\/$/, "");

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

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

/** Indian financial year of a moment, in India's time: "2026-27". */
function financialYear(at: Date) {
  const ist = new Date(at.getTime() + 5.5 * 60 * 60 * 1000);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** ENQ001/2026-27, ENQ002/2026-27 ... numbering restarts each financial year. */
async function nextEnquiryNo(db: SupabaseClient, at: Date) {
  const fy = financialYear(at);
  const { data } = await db.from("enquiries").select("enquiry_no").like("enquiry_no", `%/${fy}`);
  const last = Math.max(
    0,
    ...(data ?? []).map((r) => Number(/^ENQ(\d+)\//.exec(r.enquiry_no ?? "")?.[1] ?? 0)),
  );
  return `ENQ${String(last + 1).padStart(3, "0")}/${fy}`;
}

type Enquiry = {
  id: string;
  enquiry_no: string | null;
  company: string;
  email: string;
  answers: RfqAnswers;
  files: { path: string; name: string; size: number }[];
};

function emailHtml(e: Enquiry) {
  const sections = summarize(cleanAnswers(e.answers))
    .map(
      (s) => `
      <h3 style="margin:22px 0 6px;font-size:15px;color:#1e3a8a">${escape(s.title)}</h3>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
        ${s.rows
          .map(
            (r) => `<tr style="border-bottom:1px solid #e2e8f0">
              <td style="color:#64748b;width:45%;vertical-align:top">${escape(r.label)}</td>
              <td style="vertical-align:top"><b>${escape(r.value || "—")}</b></td></tr>`,
          )
          .join("")}
      </table>`,
    )
    .join("");
  const files = e.files.length
    ? `<h3 style="margin:22px 0 6px;font-size:15px;color:#1e3a8a">Attached files</h3>
       <ul style="margin:0;padding-left:18px;font-size:13px">${e.files
         .map((f) => `<li>${escape(f.name)} (${(f.size / 1024 / 1024).toFixed(1)} MB)</li>`)
         .join("")}</ul>
       <p style="font-size:12px;color:#64748b">Open the enquiry to download them.</p>`
    : "";
  const link = `${APP_URL}/enquiries/${e.id}`;
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:680px">
      <h2 style="margin:0 0 4px">New enquiry ${escape(e.enquiry_no)}</h2>
      <p style="margin:0 0 8px;color:#475569">${escape(e.company)} filled the transformer testing system requirement form. Reply to this email to write to the client.</p>
      <p style="margin:12px 0"><a href="${escape(link)}" style="background:#4f46e5;color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:13px">Open in the app</a></p>
      ${sections}
      ${files}
    </div>`;
}

/** Emails the office. A failure is recorded on the enquiry, never shown to the client. */
async function sendEmail(db: SupabaseClient, e: Enquiry) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ENQUIRY_EMAIL_TO") || Deno.env.get("DCC_EMAIL_TO");
  const from =
    Deno.env.get("ENQUIRY_EMAIL_FROM") ||
    Deno.env.get("DCC_EMAIL_FROM") ||
    "Electrosoft Enquiries <onboarding@resend.dev>";
  let error: string | null = null;
  if (!apiKey || !to) error = "Email is not set up (RESEND_API_KEY / ENQUIRY_EMAIL_TO)";
  else {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        reply_to: e.email || undefined,
        subject: `New enquiry ${e.enquiry_no ?? ""} · ${e.company}`.trim(),
        html: emailHtml(e),
      }),
    }).catch((cause) => new Response(String(cause), { status: 599 }));
    if (!sent.ok) error = (await sent.text()).slice(0, 500) || `HTTP ${sent.status}`;
  }
  await db
    .from("enquiries")
    .update(
      error
        ? { email_error: error }
        : { email_sent_at: new Date().toISOString(), email_error: null },
    )
    .eq("id", e.id);
}

const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return reply({ error: "Bad request" }, 400);
  }
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const token = typeof input.token === "string" ? input.token.trim() : "";

  // ---------- open: what a personal link shows ----------
  if (input.action === "open") {
    if (!token) return reply({ error: "This link is not valid." }, 404);
    const { data: row } = await db
      .from("enquiries")
      .select("company, contact_person, email, phone, submitted_at")
      .eq("token", token)
      .maybeSingle();
    if (!row)
      return reply({ error: "This link is not valid. Please ask Electrosoft for a new one." }, 404);
    if (row.submitted_at) return reply({ submitted: true, company: row.company });
    const phone = /^(\+\d{1,4})\s*(.*)$/.exec(row.phone ?? "");
    return reply({
      submitted: false,
      prefill: {
        company: row.company,
        contactPerson: row.contact_person,
        email: row.email,
        phoneCode: phone?.[1] ?? "+91",
        phone: phone ? phone[2] : row.phone,
      },
    });
  }

  // ---------- submit: save the answers ----------
  if (input.action === "submit") {
    // A bot filled the hidden field: pretend all is well and keep nothing.
    if (typeof input.website === "string" && input.website.trim()) return reply({ ok: true });

    const answers = cleanAnswers(input.answers);
    const missing = Object.keys(allErrors(answers));
    if (missing.length)
      return reply(
        { error: "Some answers are missing or not valid. Please check the form.", fields: missing },
        400,
      );

    const fileList = Array.isArray(input.files) ? input.files : [];
    if (fileList.length > MAX_FILES)
      return reply({ error: `Attach at most ${MAX_FILES} files.` }, 400);
    const files = fileList.map((f, i) => {
      const name = typeof f?.name === "string" ? f.name.slice(0, 150) : "";
      const size = Number(f?.size) || 0;
      return { name, size, problem: fileProblem(name, size), index: i + 1 };
    });
    const bad = files.find((f) => f.problem);
    if (bad) return reply({ error: bad.problem }, 400);

    const ipHash = await sha256(`enquiry:${clientIp(req)}`);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("submitted_at", hourAgo);
    if ((count ?? 0) >= HOURLY_LIMIT)
      return reply(
        {
          error:
            "Too many forms were sent from this connection. Please try again in an hour, or email us.",
        },
        429,
      );

    let id: string;
    if (token) {
      const { data: invite } = await db
        .from("enquiries")
        .select("id, submitted_at")
        .eq("token", token)
        .maybeSingle();
      if (!invite)
        return reply(
          { error: "This link is not valid. Please ask Electrosoft for a new one." },
          404,
        );
      if (invite.submitted_at)
        return reply({ error: "This form has already been submitted. Thank you!" }, 409);
      id = invite.id;
    } else {
      id = crypto.randomUUID();
    }

    const now = new Date();
    const finishKey = files.length ? randomKey() : null;
    const row = {
      company: answers.company,
      contact_person: answers.contactPerson,
      email: answers.email,
      phone: `${answers.phoneCode} ${answers.phone}`.trim(),
      answers,
      files: files.map((f) => ({
        path: `${id}/${f.index}-${safeName(f.name)}`,
        name: f.name,
        size: f.size,
      })),
      status: "new",
      submitted_at: now.toISOString(),
      ip_hash: ipHash,
      finish_key: finishKey,
    };

    // Two forms arriving together could pick the same number; the unique number then fails
    // for one of them, which simply takes the next.
    let saved: Enquiry | null = null;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const enquiryNo = await nextEnquiryNo(db, now);
      const result = token
        ? await db
            .from("enquiries")
            .update({ ...row, enquiry_no: enquiryNo })
            .eq("id", id)
            .is("submitted_at", null)
            .select("id, enquiry_no, company, email, answers, files")
            .maybeSingle()
        : await db
            .from("enquiries")
            .insert({ ...row, id, enquiry_no: enquiryNo, source: "common" })
            .select("id, enquiry_no, company, email, answers, files")
            .single();
      if (result.error?.code === "23505") continue;
      if (result.error) return reply({ error: "Could not save the form. Please try again." }, 500);
      if (!result.data)
        return reply({ error: "This form has already been submitted. Thank you!" }, 409);
      saved = result.data as Enquiry;
    }
    if (!saved) return reply({ error: "Could not save the form. Please try again." }, 500);

    if (!finishKey) {
      await sendEmail(db, saved);
      return reply({ ok: true, enquiryNo: saved.enquiry_no });
    }

    const uploads = [];
    for (const f of saved.files) {
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(f.path);
      if (error || !data)
        return reply({ error: "Could not prepare the file upload. Please try again." }, 500);
      uploads.push({ path: data.path, token: data.token });
    }
    return reply({ ok: true, enquiryNo: saved.enquiry_no, id: saved.id, finishKey, uploads });
  }

  // ---------- finish: files are up, tell the office ----------
  if (input.action === "finish") {
    const id = typeof input.id === "string" ? input.id : "";
    const finishKey = typeof input.finishKey === "string" ? input.finishKey : "";
    if (!id || !finishKey) return reply({ error: "Bad request" }, 400);
    const { data: row } = await db
      .from("enquiries")
      .select("id, enquiry_no, company, email, answers, files")
      .eq("id", id)
      .eq("finish_key", finishKey)
      .maybeSingle();
    if (!row) return reply({ error: "Already done." }, 404);

    const { data: stored } = await db.storage.from(BUCKET).list(id, { limit: 100 });
    const present = new Set((stored ?? []).map((o) => `${id}/${o.name}`));
    const enquiry = row as Enquiry;
    const files = enquiry.files.filter((f) => present.has(f.path));
    await db.from("enquiries").update({ files, finish_key: null }).eq("id", id);
    await sendEmail(db, { ...enquiry, files });
    return reply({ ok: true, missing: enquiry.files.length - files.length });
  }

  return reply({ error: "Unknown action" }, 400);
});
