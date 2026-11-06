import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/makes")({ component: () => (
  <SettingsShell title="Makes of Supply">
    <p className="text-sm text-muted-foreground mb-4">
      Items in the wizard's "Makes of Supply" table, with the manufacturers you can pick for each.
    </p>
    <LibraryEditor
      library="makes"
      itemLabel="item"
      titleKey="item"
      subtitle={m => `Default: ${m.defaultMake} · ${m.options.length} option(s)`}
      newItem={{ item: "New item", defaultMake: "", options: [], defaultEnabled: true }}
      fields={[
        { key: "item", label: "Item", type: "text" },
        { key: "defaultMake", label: "Default make", type: "text" },
        { key: "options", label: "Makes to choose from", type: "list", hint: "One manufacturer per line. Include the default make too." },
        { key: "defaultEnabled", label: "Shown in the PDF on new quotations", type: "checkbox" },
      ]}
    />
  </SettingsShell>
)});
