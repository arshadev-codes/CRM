import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { cleanAnswers, type RfqAnswers } from "@/lib/rfqForm";
import { getCurrentUser } from "@/store/authStore";

// Enquiries: requirement forms filled by clients (common link /rfq, or a personal link made
// here). Clients send them through the enquiry-form Edge Function; the office reads them here.

type Row = Database["public"]["Tables"]["enquiries"]["Row"];

export const BUCKET = "enquiry-files";

export type EnquiryStatus = "invited" | "new" | "seen" | "quoted" | "closed";

export const ENQUIRY_STATUSES: { key: EnquiryStatus; label: string; chip: string }[] = [
  { key: "new", label: "New", chip: "bg-rose-50 text-rose-700" },
  { key: "invited", label: "Link sent", chip: "bg-sky-50 text-sky-700" },
  { key: "seen", label: "Seen", chip: "bg-amber-50 text-amber-700" },
  { key: "quoted", label: "Quotation done", chip: "bg-emerald-50 text-emerald-700" },
  { key: "closed", label: "Closed", chip: "bg-slate-100 text-slate-600" },
];

export const statusMeta = (status: string) =>
  ENQUIRY_STATUSES.find((s) => s.key === status) ?? ENQUIRY_STATUSES[0];

export type EnquiryFile = { path: string; name: string; size: number };

export type Enquiry = {
  id: string;
  enquiryNo: string | null;
  status: EnquiryStatus;
  source: "common" | "personal";
  token: string | null;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  answers: RfqAnswers;
  files: EnquiryFile[];
  notes: string;
  invitedAt: string | null;
  submittedAt: string | null;
  seenAt: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  createdAt: string;
};

function asFiles(value: Json): EnquiryFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) =>
    f && typeof f === "object" && !Array.isArray(f) && typeof f.path === "string"
      ? [{ path: f.path, name: String(f.name ?? f.path), size: Number(f.size) || 0 }]
      : [],
  );
}

function fromRow(r: Row): Enquiry {
  return {
    id: r.id,
    enquiryNo: r.enquiry_no,
    status: statusMeta(r.status).key,
    source: r.source === "personal" ? "personal" : "common",
    token: r.token,
    company: r.company,
    contactPerson: r.contact_person,
    email: r.email,
    phone: r.phone,
    answers: cleanAnswers(r.answers),
    files: asFiles(r.files),
    notes: r.notes,
    invitedAt: r.invited_at,
    submittedAt: r.submitted_at,
    seenAt: r.seen_at,
    emailSentAt: r.email_sent_at,
    emailError: r.email_error,
    createdAt: r.created_at,
  };
}

/** Newest first: filled forms by when they arrived, open links by when they were sent. */
const latest = (e: Enquiry) => e.submittedAt ?? e.invitedAt ?? e.createdAt;

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from("enquiries").select("*");
    if (!error && data)
      setEnquiries(data.map(fromRow).sort((a, b) => latest(b).localeCompare(latest(a))));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { enquiries, loading, reload };
}

export function useEnquiry(id: string) {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("enquiries").select("*").eq("id", id).maybeSingle();
    setEnquiry(data ? fromRow(data) : null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { enquiry, loading, reload };
}

/** Forms waiting to be read, for the sidebar badge. */
export async function countNewEnquiries(): Promise<number> {
  const { count } = await supabase
    .from("enquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; notes?: string },
): Promise<boolean> {
  const row: Database["public"]["Tables"]["enquiries"]["Update"] = { ...patch };
  if (patch.status === "seen") {
    row.seen_at = new Date().toISOString();
    row.seen_by = getCurrentUser()?.id ?? null;
  }
  const { error } = await supabase.from("enquiries").update(row).eq("id", id);
  if (error) toast.error("Could not save — check your connection or permission");
  return !error;
}

/** Deletes an enquiry (spam, a test) with its files. */
export async function deleteEnquiry(e: Enquiry): Promise<boolean> {
  if (e.files.length) await supabase.storage.from(BUCKET).remove(e.files.map((f) => f.path));
  const { error } = await supabase.from("enquiries").delete().eq("id", e.id);
  if (error) toast.error("Could not delete — check your connection or permission");
  return !error;
}

export async function openFile(file: EnquiryFile) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.path, 60, { download: file.name });
  if (error || !data) return toast.error("Could not open the file");
  window.open(data.signedUrl, "_blank", "noopener");
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** The form's address: the common link, or a client's personal link. */
export const formLink = (token?: string | null) =>
  `${window.location.origin}/rfq${token ? `/${token}` : ""}`;

export async function copyText(text: string, what = "Link") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Could not copy — select the text and copy it yourself");
  }
}

/** A WhatsApp chat with the link already typed in (to a number when we have one). */
export function whatsappLink(link: string, phone = "", name = "") {
  const greeting = name.trim() ? `Dear ${name.trim()},` : "Dear Sir/Madam,";
  const text = `${greeting}\n\nPlease fill in your transformer testing system requirements in this form, so we can prepare a suitable technical proposal and quotation:\n${link}\n\nRegards,\nElectrosoft Automation Pvt. Ltd.`;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Makes a personal link for one client, with their details filled in for them. */
export async function inviteClient(input: {
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
}): Promise<Enquiry | null> {
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      status: "invited",
      source: "personal",
      token: newToken(),
      company: input.company.trim(),
      contact_person: input.contactPerson.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      invited_by: getCurrentUser()?.id ?? null,
      invited_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) {
    toast.error("Could not make the link — check your connection or permission");
    return null;
  }
  return fromRow(data);
}

export function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
