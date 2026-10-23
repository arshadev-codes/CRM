import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/scope-services")({ component: () => (
  <SettingsShell title="Scope of Services">
    <p className="text-sm text-muted-foreground mb-4">
      Items offered in the wizard's Proprietary step. When ticked, they print in the on-site Scope of Services
      table. Software and documentation items are left out of that table, and the warranty line uses the
      number of months chosen in the wizard.
    </p>
    <LibraryEditor
      library="proprietary"
      itemLabel="service"
      titleKey="title"
      subtitle={p => p.scopeSummary || p.description}
      filter={p => !p.inScopeOfSupply}
      newItem={{ title: "New service", description: "", scopeSummary: "", systemTypes: [], inScopeOfSupply: false }}
      fields={[
        { key: "title", label: "Name (shown in the wizard)", type: "text" },
        { key: "description", label: "Description (shown in the wizard)", type: "textarea" },
        { key: "scopeSummary", label: "Line printed in the PDF table", type: "textarea", placeholder: "Leave empty to print the description" },
        { key: "inScopeOfSupply", label: "Print under Scope of Supply (priced with qty)", type: "checkbox", hint: "Untick to print it under Scope of Services instead." },
        { key: "systemTypes", label: "System types", type: "systemTypes" },
      ]}
    />
  </SettingsShell>
)});
