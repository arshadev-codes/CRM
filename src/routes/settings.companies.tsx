import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import type { Company } from "@/data/companiesData";
import { Button } from "@/components/ui/button";
import { Plus, Save, Trash2, X, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/companies")({ component: CompaniesSettings });

type Draft = Partial<Company> & { id?: string };

const emptyDraft = (): Draft => ({
  companyFullName: "", companyShortName: "",
  address: "", city: "", state: "", country: "India", gst: "",
  contactPerson: "", designation: "", mobile: "", email: "",
});

function CompaniesSettings() {
  const companies = useProposalStore(s => s.companies);
  const addCompany = useProposalStore(s => s.addCompany);
  const updateCompany = useProposalStore(s => s.updateCompany);
  const deleteCompany = useProposalStore(s => s.deleteCompany);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");

  const list = q.trim()
    ? companies.filter(c => (c.companyFullName + " " + c.companyShortName + " " + c.city).toLowerCase().includes(q.toLowerCase()))
    : companies;

  const startEdit = (id: string) => {
    const c = companies.find(x => x.id === id);
    if (c) setDraft({ ...c });
  };
  const save = () => {
    if (!draft) return;
    if (!draft.companyFullName?.trim()) { toast.error("Company full name is required"); return; }
    const payload = {
      companyFullName: draft.companyFullName.trim(),
      companyShortName: draft.companyShortName?.trim() || draft.companyFullName.trim(),
      address: draft.address ?? "",
      city: draft.city ?? "",
      state: draft.state ?? "",
      country: draft.country ?? "India",
      gst: draft.gst ?? "",
      contactPerson: draft.contactPerson ?? "",
      designation: draft.designation ?? "",
      mobile: draft.mobile ?? "",
      email: draft.email ?? "",
    };
    if (draft.id) {
      updateCompany(draft.id, payload);
      toast.success("Company updated — available in wizard");
    } else {
      addCompany(payload);
      toast.success("Company added — now in wizard dropdown");
    }
    setDraft(null);
  };

  const Field = ({ label, k, placeholder = "" }: { label: string; k: keyof Company; placeholder?: string }) => (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1"
        value={String(draft?.[k] ?? "")}
        onChange={e => setDraft({ ...draft!, [k]: e.target.value })}
        placeholder={placeholder} />
    </div>
  );

  return (
    <SettingsShell title="Companies Master">
      <p className="text-sm text-muted-foreground mb-4">
        These companies power the <strong>auto-complete</strong> when typing the company name in the wizard.
        Add a company once and it appears in every future proposal.
      </p>

      <div className="flex gap-3 items-center mb-3">
        <div className="neo-inset flex items-center gap-2 px-3 py-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500" />
          <input className="bg-transparent outline-none text-sm flex-1" placeholder="Search companies…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex-1 text-sm text-slate-600">{list.length} of {companies.length}</div>
        {!draft && <Button size="sm" onClick={() => setDraft(emptyDraft())}><Plus className="h-3 w-3 mr-1" />Add company</Button>}
      </div>

      {draft && (
        <div className="neo-surface p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Company Full Name *" k="companyFullName" placeholder="Power Grid Corporation of India Limited" />
            <Field label="Short Name" k="companyShortName" placeholder="PGCIL" />
          </div>
          <Field label="Address" k="address" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="City" k="city" />
            <Field label="State" k="state" />
            <Field label="Country" k="country" />
            <Field label="GST" k="gst" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Contact Person" k="contactPerson" />
            <Field label="Designation" k="designation" />
            <Field label="Mobile" k="mobile" />
            <Field label="Email" k="email" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}><X className="h-3 w-3 mr-1" />Cancel</Button>
            <Button size="sm" onClick={save}><Save className="h-3 w-3 mr-1" />Save</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map(c => (
          <div key={c.id} className="neo-pop p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">{c.companyFullName}</div>
                <div className="text-[11px] text-blue-700 font-medium">{c.companyShortName}</div>
                <div className="text-xs text-slate-500 mt-1 truncate">{c.city}, {c.state} · {c.gst || "—"}</div>
                {c.contactPerson && <div className="text-xs text-slate-500 truncate">{c.contactPerson} · {c.mobile || c.email}</div>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => startEdit(c.id)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm(`Delete ${c.companyFullName}?`)) { deleteCompany(c.id); toast.success("Deleted"); }
                }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="col-span-full text-sm text-slate-500 text-center py-6">No companies match — add one above.</div>
        )}
      </div>
    </SettingsShell>
  );
}
