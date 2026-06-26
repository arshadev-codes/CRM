// Pagination utilities for PDF sections.
//
// Two strategies now coexist:
//
//   paginateBlocks(items, weightOf, capacities)
//     Legacy ESTIMATE-based packer. weightOf() guesses a block's vertical
//     space from text length before anything is ever rendered. Kept here
//     only for any section that hasn't been migrated yet — do not use this
//     for new sections, the estimate always drifts from real rendered
//     height (word-wrap, image grid layout, margins all affect real height
//     in ways a character-count formula can't see).
//
//   paginateByHeights(items, heightsMm, capacities)
//     REAL-MEASUREMENT packer. Takes actual measured heights (from
//     useBlockHeights / useDynamicPageCounts pipeline) instead of guessing.
//     Use this for any section that needs reliable "never split, never
//     clip" pagination — Subsystems, ScopeOfSupply, Terms.

// ── Real-measurement packer (preferred) ─────────────────────────────────────
export function paginateByHeights<T>(
  items: T[],
  heightsMm: number[],
  capacities: number[],
): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [[]];
  let pageIdx = 0;
  let used = 0;
  let cap = capacities[0] ?? 240;
  for (let i = 0; i < items.length; i++) {
    const h = heightsMm[i] ?? 0;
    if (pages[pageIdx].length > 0 && used + h > cap) {
      pageIdx++;
      pages.push([]);
      cap = capacities[Math.min(pageIdx, capacities.length - 1)] ?? cap;
      used = 0;
    }
    pages[pageIdx].push(items[i]);
    used += h;
  }
  return pages;
}

// ── Legacy estimate-based packer (kept for any unmigrated callers) ─────────
// Each block declares a numeric "weight" (estimated vertical space in
// arbitrary units). We fill page capacities in order, never splitting a
// block. If a single block is heavier than the page capacity it still goes
// on its own page (overflow is the lesser evil compared to splitting
// mid-block).
//
// Capacities convention:
//   capacities[0] = first page (often smaller because of a section heading)
//   capacities[1..] = subsequent pages
//   the last value is reused for any further pages
export function paginateBlocks<T>(
  items: T[],
  weightOf: (item: T) => number,
  capacities: number[],
): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [[]];
  let pageIdx = 0;
  let used = 0;
  let cap = capacities[0] ?? 240;
  for (const item of items) {
    const w = weightOf(item);
    if (pages[pageIdx].length > 0 && used + w > cap) {
      pageIdx++;
      pages.push([]);
      cap = capacities[Math.min(pageIdx, capacities.length - 1)] ?? cap;
      used = 0;
    }
    pages[pageIdx].push(item);
    used += w;
  }
  return pages;
}

// Estimate vertical space used by a subsystem block in arbitrary units (≈ mm).
// LEGACY — no longer called by SubsystemsPdf.tsx (which now uses real
// measured heights via useBlockHeights). Left here, with the s.images typo
// fixed, only in case any other code still imports this directly.
import type { SubsystemContent } from "./proposalContent";
export function weightSubsystem(
  s: SubsystemContent,
  cust?: { include: boolean; items: { title: string; description: string }[] },
): number {
  const titleLines = 1 + Math.ceil(s.title.length / 70);
  const titleW = titleLines * 7;
  const bodyLines = Math.ceil((s.description?.length ?? 0) / 95);
  const bodyW = bodyLines * 5 + 4;
  // FIXED: was `s.image` (singular — doesn't exist on SubsystemContent
  // anymore, the field was renamed to `images: string[]`). This always
  // evaluated to 0, so every block with photos was weighted as if it had
  // none — the root cause of images getting clipped at the page edge.
  const imageW = s.images && s.images.length > 0 ? 60 * s.images.length : 0;
  let custW = 0;
  if (cust?.include && cust.items && cust.items.length > 0) {
    custW = 8;
    for (const it of cust.items) {
      custW += 4 + Math.ceil((it.title?.length ?? 0) / 80) * 5;
      custW += Math.ceil((it.description?.length ?? 0) / 90) * 5;
    }
  }
  return titleW + bodyW + imageW + custW + 6; // 6 = inter-block gap
}