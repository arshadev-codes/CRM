import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";
import { familyOf } from "@/data/catalogFamilies";

export const Route = createFileRoute("/settings/instruments")({ component: () => (
  <SettingsShell title="Instruments Library">
    <p className="text-sm text-muted-foreground mb-4">
      The "Add from list" picker in the wizard's Instruments table. Items with the same Family are shown together as variants.
    </p>
    <LibraryEditor
      library="instruments"
      itemLabel="instrument"
      titleKey="instrument"
      subtitle={i => [familyOf("instruments", i), i.make, i.model].filter(Boolean).join(" · ")}
      newItem={{ instrument: "New instrument", family: "", make: "", model: "", spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" }}
      fields={[
        { key: "instrument", label: "Instrument", type: "text" },
        { key: "family", label: "Family (e.g. Voltage Ratio Meter) — leave empty to use the built-in grouping", type: "text", placeholder: "Voltage Ratio Meter" },
        { key: "make", label: "Make", type: "text" },
        { key: "model", label: "Model", type: "text" },
        { key: "spec1", label: "Spec-1", type: "text" },
        { key: "spec2", label: "Spec-2", type: "text" },
        { key: "spec3", label: "Spec-3", type: "text" },
        { key: "spec4", label: "Spec-4", type: "text" },
        { key: "spec5", label: "Spec-5", type: "text" },
      ]}
    />
  </SettingsShell>
)});
