import { createFileRoute, Link } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/scope-supply")({ component: () => (
  <SettingsShell title="Scope of Supply">
    <p className="text-sm text-muted-foreground mb-4">
      The Scope of Supply table is made of the selected{" "}
      <Link to="/settings/subsystems" className="text-blue-600 underline">Major Sub Systems</Link>, followed by
      the items below when they are ticked in the wizard's Proprietary step.
    </p>
    <LibraryEditor
      library="proprietary"
      itemLabel="item"
      titleKey="title"
      subtitle={p => p.scopeSummary || p.description}
      filter={p => !!p.inScopeOfSupply}
      newItem={{ title: "New item", description: "", scopeSummary: "", systemTypes: [], inScopeOfSupply: true }}
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
