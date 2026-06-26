// ─────────────────────────────────────────────────────────────────────────────
//  paginateByMeasuredHeights
//
//  Groups items into pages using their real measured heights (mm) so that
//  no page overflows and no page wastes space through bad weight estimates.
//
//  Args:
//    items          — T[] — the data objects
//    heightsMm      — number[] — measured height of each item in mm (same order)
//    firstPageBudget  — mm available on page 1 (smaller because of title/intro)
//    otherPageBudget  — mm available on all subsequent pages
//
//  How to calculate budgets from PdfPage:
//    Page height:        297mm
//    Top padding:         12mm
//    Bottom padding:      14mm
//    Header height:      ~15mm  (logo 12mm + border + pb-2)
//    Content pt-3:        ~3mm
//    Footer height:      ~14mm  (border + pt-2 + mt-3 + 3 lines × ~3mm)
//    ─────────────────────────────────────────────────────
//    Total overhead:     ~58mm
//    Available per page: 297 - 58 = ~239mm
//
//    firstPageBudget is further reduced by the title block height.
//    Pass the measured titleBlockHeightMm in for accuracy, or use the default.
// ─────────────────────────────────────────────────────────────────────────────

export function paginateByMeasuredHeights<T>(
  items: T[],
  heightsMm: number[],
  firstPageBudget: number,
  otherPageBudget: number
): T[][] {
  if (items.length === 0) return [[]];

  const pages: T[][] = [];
  let currentPage: T[] = [];
  let remaining = firstPageBudget;

  for (let i = 0; i < items.length; i++) {
    const h = heightsMm[i] ?? 0;

    if (h > remaining && currentPage.length > 0) {
      // Current item won't fit — push current page, start new one
      pages.push(currentPage);
      currentPage = [];
      remaining = otherPageBudget;
    }

    currentPage.push(items[i]);
    remaining -= h;
  }

  if (currentPage.length > 0) pages.push(currentPage);

  return pages;
}