import { useCallback, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  useDynamicPageCounts
//
//  Single registry for every PDF section whose page count can only be known
//  AFTER a real-DOM measurement pass (Subsystems, ScopeOfSupply, Terms — any
//  section built on useBlockHeights). Replaces the old pattern of one
//  useState per section in AllPages.tsx.
//
//  WHY THIS EXISTS:
//  Page counts for these sections are no longer pure functions of `project`
//  (paginateBlocks + a character-count heuristic). They depend on real
//  rendered height, which is only known after a measure-and-commit render
//  cycle (see useBlockHeights.ts). Page numbers for every section AFTER a
//  dynamic one depend on that dynamic section's count.
//
//  If each section held its own `useState` + fired its own callback
//  independently (as the old TermsPdf did), AllPages would re-render once
//  per section as each one settles — meaning intermediate renders carry a
//  MIX of real counts (for sections that already reported) and fallback
//  counts (for sections that haven't yet). For on-screen preview that's a
//  brief flicker. For Puppeteer PDF export, snapshotting during that window
//  bakes in permanently wrong page numbers.
//
//  Fix: one state object keyed by section name. AllPages reads `counts` and
//  `isSettled` and recomputes ALL startPage/pageNumber values together, in
//  one place, every time ANY section's count changes. `isSettled` flips true
//  only once every expected section has reported at least once — Puppeteer
//  should wait on a DOM marker tied to that before calling page.pdf().
// ─────────────────────────────────────────────────────────────────────────────

export type DynamicSectionKey = "subsystems" | "scopeOfSupply" | "terms";

const SECTION_KEYS: DynamicSectionKey[] = ["subsystems", "scopeOfSupply", "terms"];

export interface DynamicPageCounts {
  /** Real measured page count per section, once known. Missing key = not yet measured. */
  counts: Partial<Record<DynamicSectionKey, number>>;
  /** True once every section in SECTION_KEYS has reported at least once. */
  isSettled: boolean;
  /**
   * Stable per-section callback factory. Call once per section, e.g.
   *   const reportSubsystems = report("subsystems");
   *   <SubsystemsPdf onPageCountKnown={reportSubsystems} ... />
   * Returned function is referentially stable across renders for a given
   * key, so it's safe to pass directly as a prop without re-triggering
   * effects/measurement in the child.
   */
  report: (key: DynamicSectionKey) => (count: number) => void;
  /** Look up a section's count with a fallback (use while count is still unknown). */
  getCount: (key: DynamicSectionKey, fallback: number) => number;
}

export function useDynamicPageCounts(expected?: DynamicSectionKey[]): DynamicPageCounts {
  const [counts, setCounts] = useState<Partial<Record<DynamicSectionKey, number>>>({});

  // One stable callback per key, cached for the lifetime of the component.
  // Avoids creating a new function identity every render (which would
  // otherwise be a fresh prop reference each time -> risk of re-triggering
  // effects in children that depend on callback identity).
  const callbacksRef = useRef<Partial<Record<DynamicSectionKey, (count: number) => void>>>({});

  const report = useCallback((key: DynamicSectionKey) => {
    const existing = callbacksRef.current[key];
    if (existing) return existing;

    const fn = (count: number) => {
      setCounts((prev) => {
        if (prev[key] === count) return prev; // no-op, skip re-render
        return { ...prev, [key]: count };
      });
    };
    callbacksRef.current[key] = fn;
    return fn;
  }, []);

  const getCount = useCallback(
    (key: DynamicSectionKey, fallback: number) => counts[key] ?? fallback,
    [counts],
  );

  // Only sections actually included in this document have to report in.
  const isSettled = (expected ?? SECTION_KEYS).every((k) => counts[k] !== undefined);

  return { counts, isSettled, report, getCount };
}

