import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/instruments")({ component: () => (
  <SettingsShell title="Instruments Library">
    <p className="text-sm text-muted-foreground mb-4">
      The "Add from library" list in the wizard's Instruments table.
    </p>
    <LibraryEditor
      library="instruments"
      itemLabel="instrument"
      titleKey="instrument"
      subtitle={i => [i.make, i.model].filter(Boolean).join(" · ")}
      newItem={{ instrument: "New instrument", make: "", model: "", spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" }}
      fields={[
        { key: "instrument", label: "Instrument", type: "text" },
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
