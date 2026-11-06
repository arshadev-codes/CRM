import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase } from "@/lib/db";
import { callFunction } from "@/lib/edgeFunction";
import {
  DECLARATION,
  PDI_CATEGORIES,
  sectionsFor,
  type PdiCategory,
  type PdiResponses,
  type PdiRow,
} from "@/lib/pdi";

/*
 * Dispatch Clearance Code (DCC): a random code like "DCC-7KQ3X9" given to a panel when its
 * PDI is submitted. The cloud database hands out the codes and keeps every one ever issued,
 * so no code is reused on any project. The report is then emailed as a PDF to the fixed
 * dispatch inbox (Edge Function "send-dcc").
 */

// No 0/O or 1/I/L, so a code read out over the phone cannot be misheard.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LOCAL_REGISTRY = "electrosoft-demo:dcc_registry";

export type DccIssue = { dcc: string; local: boolean };

function readLocalRegistry(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_REGISTRY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

// Demo mode only: unique in this browser, until the cloud registry is set up.
function issueLocal(reportId: string) {
  const registry = readLocalRegistry();
  const existing = Object.entries(registry).find(([, id]) => id === reportId)?.[0];
  if (existing) return existing;
  let code: string;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    code = `DCC-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
  } while (registry[code]);
  registry[code] = reportId;
  try {
    localStorage.setItem(LOCAL_REGISTRY, JSON.stringify(registry));
  } catch {
    /* storage unavailable */
  }
  return code;
}

// Returns the report's DCC, issuing one the first time. Safe to call again.
export async function issueDcc(report: PdiRow): Promise<DccIssue> {
  if (report.dcc) return { dcc: report.dcc, local: !(await cloudHasDcc(report.dcc)) };
  let dcc: string | null = null;
  try {
    const { data, error } = await cloud.rpc("issue_dcc", {
      p_report_id: report.id,
      p_order_id: report.inward_order_id,
      p_project: report.project_number,
      p_serial: report.panel_serial,
    });
    if (!error && data) dcc = data;
  } catch {
    /* cloud unreachable */
  }
  const local = !dcc;
  if (!dcc) dcc = issueLocal(report.id);
  await supabase.from("pdi_reports").update({ dcc }).eq("id", report.id);
  return { dcc, local };
}

async function cloudHasDcc(dcc: string) {
  try {
    const { data } = await cloud.from("dcc_registry").select("dcc").eq("dcc", dcc).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/* ---------- PDF ---------- */

function stamp(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function answerText(value: PdiResponses[string] | undefined) {
  if (value === "na") return "N/A";
  if (value === "yes") return "Yes";
  return value ? "OK" : "-";
}

export function dccFileName(report: PdiRow) {
  const serial = (report.panel_serial || "panel").replace(/[^\w-]+/g, "_");
  return `${report.dcc ?? "PDI"}_${serial}.pdf`;
}

export async function buildDccPdf(report: PdiRow) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const primary: [number, number, number] = [37, 99, 235];
  const category = report.panel_category as PdiCategory;
  const responses = (report.responses ?? {}) as PdiResponses;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Pre-Dispatch Inspection Report", margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Electrosoft · Dispatch clearance", margin, 26);

  // DCC box, top right.
  const boxWidth = 62;
  doc.setDrawColor(...primary);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(pageWidth - margin - boxWidth, 12, boxWidth, 18, 2, 2, "FD");
  doc.setTextColor(100);
  doc.setFontSize(7);
  doc.text("DISPATCH CLEARANCE CODE", pageWidth - margin - boxWidth / 2, 18, { align: "center" });
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(report.dcc ?? "-", pageWidth - margin - boxWidth / 2, 26, { align: "center" });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 36,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.6 },
    columnStyles: { 0: { textColor: 110, cellWidth: 38 }, 1: { fontStyle: "bold" } },
    body: [
      ["Project no.", report.project_number],
      ["Customer", report.customer_name],
      ["Panel serial", report.panel_serial],
      ["Panel name", report.panel_name],
      ["Panel type", PDI_CATEGORIES.find((c) => c.value === category)?.label ?? category],
      ["Inspected by", `${report.inspector_name} (${report.inspector_email})`],
      ["Submitted on", stamp(report.submitted_at)],
    ],
    margin: { left: margin, right: margin },
  });

  for (const section of sectionsFor(category)) {
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5,
      head: [[{ content: section.title, colSpan: 3 }]],
      body: section.items.map((item, index) => [
        String(index + 1),
        item.label,
        answerText(responses[item.key]),
      ]),
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: primary, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: 120 },
        2: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 2) return;
        const text = String(data.cell.raw);
        data.cell.styles.textColor =
          text === "N/A" ? [100, 116, 139] : text === "-" ? [190, 18, 60] : [5, 150, 105];
      },
    });
  }

  const tail: string[][] = [];
  if (report.remarks) tail.push(["Remarks", report.remarks]);
  tail.push([
    "Declaration",
    `${DECLARATION}\nConfirmed by ${report.inspector_name} on ${stamp(report.submitted_at)}.`,
  ]);
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold", fillColor: [241, 245, 249] } },
    body: tail,
    margin: { left: margin, right: margin },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    const y = doc.internal.pageSize.getHeight() - 8;
    doc.text(`${report.dcc ?? ""} · Panel ${report.panel_serial}`, margin, y);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, y, { align: "right" });
  }
  return doc;
}

export async function downloadDccPdf(report: PdiRow) {
  const doc = await buildDccPdf(report);
  doc.save(dccFileName(report));
}

/* ---------- Email ---------- */

export type EmailResult = { ok: true; emailedAt: string } | { ok: false; error: string };

export async function emailDcc(report: PdiRow): Promise<EmailResult> {
  if (!report.dcc) return { ok: false, error: "No DCC yet" };
  let pdfBase64: string;
  try {
    const doc = await buildDccPdf(report);
    pdfBase64 = doc.output("datauristring").split(",")[1];
  } catch {
    return { ok: false, error: "Could not make the PDF" };
  }
  const result = await callFunction<{ emailedAt: string }>("send-dcc", {
    dcc: report.dcc,
    pdfBase64,
    fileName: dccFileName(report),
    report,
  });
  if (!result.ok) return result;
  const { emailedAt } = result.data;
  await supabase.from("pdi_reports").update({ dcc_emailed_at: emailedAt }).eq("id", report.id);
  return { ok: true, emailedAt };
}
