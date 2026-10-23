import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { useLibrary } from "@/hooks/useLibrary";
import { useConnectionsMap } from "@/data/connectionsHelpers";
import {
  connectionLabels,
  METHOD_415V_IMPLIED_B,
  type ConnectionGroup,
} from "@/data/connectionsData";

import connectionA from "@/assets/Connection-A.png";
import connectionB from "@/assets/Connection-B.png";
import connectionC from "@/assets/Connection-C.png";

const connectionImages: Record<string, string> = {
  A: connectionA,
  B: connectionB,
  C: connectionC,
};

export function ConnectionsTestsPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const testsData = useLibrary("tests");
  // Settings -> Connections edits on top of the built-in test-to-connection map.
  const testToConnection = useConnectionsMap();
  const selected = new Set(project.data.selectedTests);
  const has415v = selected.has("415v-method");

  // ── Build groups ────────────────────────────────────────────────────────
  const groups: Record<"A" | "B" | "C" | "Other", { id: string; title: string }[]> = {
    A: [], B: [], C: [], Other: [],
  };

  for (const t of testsData) {
    if (!selected.has(t.id)) continue;
    const g = testToConnection[t.id] ?? "Other";

    if (t.id === "415v-method") {
      // Never add "415v-method" as its own row — implied tests are injected below
      continue;
    }

    groups[g].push({ id: t.id, title: t.title });
  }

  // When 415v-method is selected, inject the two implied tests into Connection B.
  // Dedup: don't add if an identical id is already present (shouldn't happen but safe).
  if (has415v) {
    for (const implied of METHOD_415V_IMPLIED_B) {
      if (!groups.B.some((t) => t.id === implied.id)) {
        groups.B.push(implied);
      }
    }
  }

  // Other tests — shown as footnote only (OLTC, Core-Tank, etc.)
  // 415v-method itself appears as a footnote entry when selected
  const otherTests = [...groups.Other];
  if (has415v) {
    const t415 = testsData.find((t) => t.id === "415v-method");
    if (t415) otherTests.unshift({ id: t415.id, title: t415.title });
  }

  const mainGroups = (["A", "B", "C"] as const).filter((g) => groups[g].length > 0);
  const topRow    = mainGroups.filter((g) => g === "A" || g === "B");
  const bottomRow = mainGroups.filter((g) => g === "C");

  return (
    <PdfPage pageNumber={pageNumber}>
      {/* Title */}
      <div style={{ breakInside: "avoid" }}>
        <h2 className="text-[18px] font-bold text-blue-900 uppercase tracking-wide">
          Connections and Tests
        </h2>
      </div>

      {/* ── Connection A + B side by side ─────────────────────────────── */}
      {topRow.length > 0 && (
        <div className="mt-4 flex gap-6 justify-center" style={{ breakInside: "avoid" }}>
          {topRow.map((g) => (
            <div key={g} className="flex flex-col items-center" style={{ width: "72%" }}>
              <img
                src={connectionImages[g]}
                alt={connectionLabels[g]}
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
              />
              <div className="text-[14px] italic text-slate-600 mt-1">
                {connectionLabels[g]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Connection C centered below ────────────────────────────────── */}
      {bottomRow.length > 0 && (
        <div className="mt-3 flex justify-center" style={{ breakInside: "avoid" }}>
          {bottomRow.map((g) => (
            <div key={g} className="flex flex-col items-center" style={{ width: "62%" }}>
              <img
                src={connectionImages[g]}
                alt={connectionLabels[g]}
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
              />
              <div className="text-[14px] italic text-slate-600 mt-1">
                {connectionLabels[g]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Numbered test lists (continuous numbering across A, B, C) ─── */}
      <div className="mt-5 space-y-3">
        {(() => {
          let running = 0;
          return mainGroups.map((g) => {
            const start = running + 1;
            running += groups[g].length;
            return (
              <div key={g} style={{ breakInside: "avoid" }}>
                <div className="font-bold text-[14px] text-slate-900 ">
                  {connectionLabels[g]}
                </div>
                <ol
                  start={start}
                  className="mt-0.5 list-decimal pl-6 text-[13px] space-y-0.5 text-slate-800"
                >
                  {groups[g].map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ol>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Other / footnote tests ─────────────────────────────────────── */}
      {/* {otherTests.length > 0 && (
        <div className="mt-6 pt-3 border-t border-slate-300 text-[10px] text-slate-500">
          <span className="font-semibold">++</span>{" "}
          {otherTests.map((t) => t.title).join(", ")}
        </div>
      )} */}

      {/* ── Optional user notes ─────────────────────────────────────────── */}
      {project.data.testsNotes && project.data.testsNotes.trim() && (
        <div className="mt-5 pt-3 border-t border-slate-300" style={{ breakInside: "avoid" }}>
          <div className="font-bold text-[13px] text-slate-900">Notes:</div>
          <p className="text-[12.5px] text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
            {project.data.testsNotes.trim()}
          </p>
        </div>
      )}

      {mainGroups.length === 0 && otherTests.length === 0 && (
        <p className="text-[10px] text-slate-500 italic mt-6">No tests selected yet.</p>
      )}
    </PdfPage>
  );
}