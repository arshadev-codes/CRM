import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/exclusions")({ component: () => (
  <SettingsShell title="Exclusions">
    <p className="text-sm text-muted-foreground mb-4">
      Exclusions offered in the wizard and printed under "List of Exclusions".
    </p>
    <LibraryEditor
      library="exclusions"
      itemLabel="exclusion"
      titleKey="title"
      subtitle={e => e.defaultIncluded ? "Ticked on new quotations" : "Not ticked on new quotations"}
      newItem={{ title: "New exclusion", defaultIncluded: true }}
      fields={[
        { key: "title", label: "Exclusion", type: "textarea" },
        { key: "defaultIncluded", label: "Ticked on new quotations", type: "checkbox" },
      ]}
    />
  </SettingsShell>
)});
