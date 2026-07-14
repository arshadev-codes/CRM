import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";

export const Route = createFileRoute("/settings/employees")({ component: EmployeesSettings });

type Draft = { id?: string; name: string; designation: string };

function EmployeesSettings() {
  const employees = useProposalStore(s => s.employees);
  const addEmployee = useProposalStore(s => s.addEmployee);
  const updateEmployee = useProposalStore(s => s.updateEmployee);
  const deleteEmployee = useProposalStore(s => s.deleteEmployee);
  const [draft, setDraft] = useState<Draft | null>(null);

  const startNew = () => { if (!requireAdminPassword()) return; setDraft({ name: "", designation: "" }); };
  const startEdit = (id: string) => {
    const e = employees.find(x => x.id === id);
    if (e) setDraft({ id: e.id, name: e.name, designation: e.designation });
  };
  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    if (draft.id) {
      updateEmployee(draft.id, { name: draft.name.trim(), designation: draft.designation.trim() });
      toast.success("Employee updated — available in dropdowns");
    } else {
      addEmployee({ name: draft.name.trim(), designation: draft.designation.trim() });
      toast.success("Employee added — now available in wizard dropdowns");
    }
    setDraft(null);
  };

  return (
    <SettingsShell title="Employees Master">
      <p className="text-sm text-muted-foreground mb-4">
        These employees populate the <strong>Prepared By</strong> and <strong>Checked By</strong> dropdowns in the wizard.
        Add or edit anyone here and the wizard updates instantly.
      </p>

      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-slate-600">{employees.length} employee{employees.length === 1 ? "" : "s"}</div>
        {!draft && <Button size="sm" onClick={startNew}><Plus className="h-3 w-3 mr-1" />Add employee</Button>}
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
              <div className="text-xs text-slate-500 truncate">{e.designation || "—"}</div>
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
          <div className="text-sm text-slate-500 text-center py-6">No employees yet — add one above.</div>
        )}
      </div>
    </SettingsShell>
  );
}

