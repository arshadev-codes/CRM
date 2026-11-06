import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/equipment")({ component: () => (
  <SettingsShell title="Equipment Library">
    <p className="text-sm text-muted-foreground mb-4">
      Equipment rows of a new quotation, and the "Add from library" list in the wizard's Equipment table.
    </p>
    <LibraryEditor
      library="equipment"
      itemLabel="equipment"
      titleKey="equipment"
      subtitle={e => [e.spec1, e.spec2, e.spec3].filter(Boolean).join(" · ")}
      newItem={{ equipment: "New equipment", included: true, spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" }}
      fields={[
        { key: "equipment", label: "Equipment", type: "text" },
        { key: "included", label: "Ticked \"Yes\" when added from the library", type: "checkbox" },
        { key: "spec1", label: "Spec-1", type: "text" },
        { key: "spec2", label: "Spec-2", type: "text" },
        { key: "spec3", label: "Spec-3", type: "text" },
        { key: "spec4", label: "Spec-4", type: "text" },
        { key: "spec5", label: "Spec-5", type: "text" },
      ]}
    />
  </SettingsShell>
)});
