import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";

export const Route = createFileRoute("/settings/tests")({ component: () => (
  <SettingsShell title="Tests Library">
    <p className="text-sm text-muted-foreground mb-4">
      Tests listed in the wizard's Tests step and printed on the Requirement and Connections pages.
      After adding a test, set its connection group under Settings → Connections.
    </p>
    <LibraryEditor
      library="tests"
      itemLabel="test"
      titleKey="title"
      subtitle={t => t.group}
      newItem={{ title: "New test", group: "Routine" }}
      fields={[
        { key: "title", label: "Test name", type: "text" },
        { key: "group", label: "Group", type: "select", options: ["Routine", "Type", "Special"] },
      ]}
    />
  </SettingsShell>
)});
