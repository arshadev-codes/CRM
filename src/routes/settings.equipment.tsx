import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";
import { familyOf } from "@/data/catalogFamilies";

export const Route = createFileRoute("/settings/equipment")({ component: () => (
  <SettingsShell title="Equipment Library">
    <p className="text-sm text-muted-foreground mb-4">
      The "Add from list" picker in the wizard's Equipment table. Items with the same Family are shown together as variants.
    </p>
    <LibraryEditor
      library="equipment"
      itemLabel="equipment"
      titleKey="equipment"
      subtitle={e => [familyOf("equipment", e), e.spec1, e.spec2].filter(Boolean).join(" · ")}
      newItem={{ equipment: "New equipment", family: "", included: true, spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" }}
      fields={[
        { key: "equipment", label: "Equipment", type: "text" },
        { key: "family", label: "Family (e.g. HV Transformer) — leave empty to use the built-in grouping", type: "text", placeholder: "HV Transformer" },
        { key: "spec1", label: "Spec-1", type: "text" },
        { key: "spec2", label: "Spec-2", type: "text" },
        { key: "spec3", label: "Spec-3", type: "text" },
        { key: "spec4", label: "Spec-4", type: "text" },
        { key: "spec5", label: "Spec-5", type: "text" },
      ]}
    />
  </SettingsShell>
)});
