import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";
import { isQuotationPerson } from "@/data/employeesData";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/employees")({ component: EmployeesSettings });

type Draft = {
  id?: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  joinedOn: string;
  active: boolean;
};
const EMPTY: Draft = { name: "", designation: "", department: "", phone: "", joinedOn: "", active: true };

function EmployeesSettings() {
  const allEmployees = useProposalStore(s => s.employees);
  const employees = allEmployees.filter(isQuotationPerson);
  const addEmployee = useProposalStore(s => s.addEmployee);
  const updateEmployee = useProposalStore(s => s.updateEmployee);
  const deleteEmployee = useProposalStore(s => s.deleteEmployee);
  const [draft, setDraft] = useState<Draft | null>(null);

  const startNew = () => { if (!requireAdminPassword("settings")) return; setDraft({ ...EMPTY }); };
  const startEdit = (id: string) => {
    const e = employees.find(x => x.id === id);
    if (e) setDraft({
      id: e.id,
      name: e.name,
      designation: e.designation,
      department: e.department ?? "",
      phone: e.phone ?? "",
      joinedOn: e.joinedOn ?? "",
      active: e.active !== false,
    });
  };
  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    const fields = {
      name: draft.name.trim(),
      designation: draft.designation.trim(),
      department: draft.department.trim(),
      phone: draft.phone.trim(),
      joinedOn: draft.joinedOn,
      active: draft.active,
    };
    if (draft.id) {
      updateEmployee(draft.id, fields);
      toast.success("Updated");
    } else {
      addEmployee({ ...fields, scope: "quotation" });
      toast.success("Added — now available in the wizard's Prepared / Checked by");
    }
    setDraft(null);
  };

  return (
    <SettingsShell title="Quotation people">
      <p className="text-sm text-muted-foreground mb-4">
        These people appear in the <strong>Prepared By</strong> and <strong>Checked By</strong> dropdowns
        of the quotation wizard. The workshop team is managed separately in the{" "}
        <Link to="/employees" className="font-semibold text-indigo-600 hover:underline">Employees</Link> section.
      </p>

      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-slate-600">{employees.length} {employees.length === 1 ? "person" : "people"}</div>
        {!draft && <Button size="sm" onClick={startNew}><Plus className="h-3 w-3 mr-1" />Add person</Button>}
      </div>

      {draft && (
        <div className="neo-surface p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Name *</label>
              <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1"
                value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Designation</label>
              <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1"
                value={draft.designation} onChange={e => setDraft({ ...draft, designation: e.target.value })}
                placeholder="e.g. Sales Engineer" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Department</label>
              <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1"
                value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })}
                placeholder="e.g. Production" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Phone</label>
              <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1" type="tel"
                value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}
                placeholder="e.g. 98200 00000" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Joined on</label>
              <input className="neo-inset w-full px-3 py-2 text-sm outline-none mt-1" type="date"
                value={draft.joinedOn} onChange={e => setDraft({ ...draft, joinedOn: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
              <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}><X className="h-3 w-3 mr-1" />Cancel</Button>
            <Button size="sm" onClick={save}><Save className="h-3 w-3 mr-1" />Save</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {employees.map(e => (
          <div key={e.id} className="neo-pop p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-800 truncate">{e.name}</div>
              <div className="text-xs text-slate-500 truncate">
                {[e.designation, e.department].filter(Boolean).join(" · ") || "—"}
                {e.active === false && " · Inactive"}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => startEdit(e.id)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              if (confirm(`Delete ${e.name}?`)) { deleteEmployee(e.id); toast.success("Deleted"); }
            }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {employees.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6">Nobody yet. Add someone above.</div>
        )}
      </div>
    </SettingsShell>
  );
}

