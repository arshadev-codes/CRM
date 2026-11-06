import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ClipboardCheck, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewOnlyBadge } from "@/components/auth/Can";
import { useCan } from "@/store/authStore";
import {
  TEST_GROUPS,
  usePanelTemplates,
  type PanelTemplate,
  type PanelTest,
} from "@/lib/panelTests";

export const Route = createFileRoute("/panel-tests")({
  head: () => ({ meta: [{ title: "Panel tests — Electrosoft Proposal Engine" }] }),
  component: PanelTestsPage,
});

type Draft = {
  id?: string;
  name: string;
  aliases: string;
  tests: PanelTest[];
  displayOrder: number;
};

const toDraft = (t: PanelTemplate): Draft => ({
  id: t.id,
  name: t.name,
  aliases: t.aliases.join(", "),
  tests: t.tests,
  displayOrder: t.displayOrder,
});

// The panels we build and the tests done on each. The Testing page of an order gives every
// panel the tests listed here for its panel type.
function PanelTestsPage() {
  const canEdit = useCan("panel_tests");
  const { templates, loading, save, remove } = usePanelTemplates();
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId);
  useEffect(() => {
    if (selectedId === "new") return;
    if (selected) setDraft(toDraft(selected));
    else if (!selectedId && templates[0]) setSelectedId(templates[0].id);
  }, [selectedId, selected, templates]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(
      (t) => !q || [t.name, ...t.aliases].some((n) => n.toLowerCase().includes(q)),
    );
  }, [templates, query]);

  function startNew() {
    setSelectedId("new");
    setDraft({ name: "", aliases: "", tests: [], displayOrder: templates.length + 1 });
  }

  async function onSave() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Give the panel a name");
    if (!draft.tests.some((t) => t.title.trim())) return toast.error("Add at least one test");
    setSaving(true);
    const ok = await save({
      id: draft.id,
      name: draft.name,
      aliases: draft.aliases.split(","),
      tests: draft.tests,
      displayOrder: draft.displayOrder,
    });
    setSaving(false);
    if (!ok) return;
    toast.success("Panel saved");
    if (!draft.id) setSelectedId(null);
  }

  async function onDelete() {
    if (!draft?.id || !confirm(`Delete "${draft.name}" and its tests from the library?`)) return;
    await remove(draft.id);
    setSelectedId(null);
    setDraft(null);
    toast.success("Panel deleted");
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Panel tests</h1>
            <ViewOnlyBadge perm="panel_tests" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Each panel type and the tests done on it. On an order, every panel from the BOM gets the
            tests of its panel type on the Testing page.
          </p>
        </div>
        {canEdit && (
          <Button className="rounded-xl" onClick={startNew}>
            <Plus className="h-4 w-4" /> New panel
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* Panel list */}
        <div className="neo-surface h-fit rounded-2xl p-3">
          <div className="neo-inset mb-2 flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              data-no-neo
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search panels"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="space-y-2 p-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {shown.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      t.id === selectedId
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="truncate">{t.name}</div>
                    <div className="text-[11px] font-normal text-slate-400">
                      {t.tests.length} tests
                    </div>
                  </button>
                </li>
              ))}
              {selectedId === "new" && (
                <li className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  New panel…
                </li>
              )}
              {!shown.length && selectedId !== "new" && (
                <li className="px-3 py-6 text-center text-xs text-slate-400">No panels found.</li>
              )}
            </ul>
          )}
        </div>

        {/* Editor */}
        {draft ? (
          <TemplateEditor
            draft={draft}
            setDraft={setDraft}
            canEdit={canEdit}
            saving={saving}
            onSave={() => void onSave()}
            onDelete={() => void onDelete()}
            onCancel={() => {
              setSelectedId(null);
              setDraft(null);
            }}
          />
        ) : (
          <div className="neo-surface grid place-items-center rounded-2xl py-20 text-sm text-slate-500">
            {loading ? "Loading…" : "Pick a panel on the left, or add a new one."}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({
  draft,
  setDraft,
  canEdit,
  saving,
  onSave,
  onDelete,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [group, setGroup] = useState("Checklist");
  const [title, setTitle] = useState("");
  const groups = useMemo(
    () => [...new Set([...draft.tests.map((t) => t.group || "Other tests")])],
    [draft.tests],
  );

  const setTests = (tests: PanelTest[]) => setDraft({ ...draft, tests });
  function addTest() {
    if (!title.trim()) return;
    setTests([...draft.tests, { group: group.trim() || "Checklist", title: title.trim() }]);
    setTitle("");
  }
  function move(index: number, by: -1 | 1) {
    const next = [...draft.tests];
    const to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setTests(next);
  }

  return (
    <div className="neo-surface rounded-2xl p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Panel name *</span>
          <Input
            className="mt-1"
            value={draft.name}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. RIO Panel"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Also called (comma separated)</span>
          <Input
            className="mt-1"
            value={draft.aliases}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, aliases: e.target.value })}
            placeholder="e.g. Test Bench, Desk Panel"
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Names this panel may have in a BOM, so it is matched automatically.
          </span>
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {groups.map((g) => (
          <div key={g}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {g}
            </h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {draft.tests.map((t, i) =>
                (t.group || "Other tests") !== g ? null : (
                  <li key={`${i}-${t.title}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 text-slate-700">{t.title}</span>
                    {canEdit && (
                      <span className="flex shrink-0 items-center">
                        <IconBtn label="Move up" onClick={() => move(i, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Move down" onClick={() => move(i, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Remove test"
                          danger
                          onClick={() => setTests(draft.tests.filter((_, j) => j !== i))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </IconBtn>
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
        {!draft.tests.length && (
          <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
            No tests yet. Add the first one below.
          </p>
        )}
      </div>

      {canEdit && (
        <>
          <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Group</span>
              <Input
                className="mt-1 bg-white"
                list="pt-groups"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              />
              <datalist id="pt-groups">
                {[...new Set([...TEST_GROUPS, ...groups])].map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Test</span>
              <Input
                className="mt-1 bg-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTest()}
                placeholder="e.g. Wire continuity test"
              />
            </label>
            <Button variant="outline" onClick={addTest}>
              <Plus className="h-4 w-4" /> Add test
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            {draft.id ? (
              <Button
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" /> Delete panel
              </Button>
            ) : (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save panel"}
            </Button>
          </div>
        </>
      )}
      {!canEdit && (
        <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-500">
          <ClipboardCheck className="h-3.5 w-3.5" /> Ask the admin for the "Panel tests library"
          permission to change this list.
        </p>
      )}
    </div>
  );
}

function IconBtn({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded p-1 text-slate-400 hover:bg-slate-100 ${danger ? "hover:text-rose-600" : "hover:text-slate-700"}`}
    >
      {children}
    </button>
  );
}
