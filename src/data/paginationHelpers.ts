// Greedy block packer for PDF pagination.
// Each block declares a numeric "weight" (estimated vertical space in arbitrary
// units). We fill page capacities in order, never splitting a block. If a single
// block is heavier than the page capacity it still goes on its own page
// (overflow is the lesser evil compared to splitting mid-block).
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
// Tuned so the standard 12 ATTS subsystems split across ~9 A4 pages, matching
// the reference proposal.
import type { SubsystemContent } from "./proposalContent";
export function weightSubsystem(
  s: SubsystemContent,
  cust?: { include: boolean; items: { title: string; description: string }[] },
): number {
  const titleLines = 1 + Math.ceil(s.title.length / 70);
  const titleW = titleLines * 7;
  const bodyLines = Math.ceil((s.description?.length ?? 0) / 95);
  const bodyW = bodyLines * 5 + 4;
  const imageW = s.image ? 60 : 0;
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
