import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  createElement,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────────────────────────────────────
//  useBlockHeights
//
//  Measures the real rendered pixel height of content blocks for PDF
//  pagination. Uses a React portal into a hidden <div> on <body> so
//  measurement happens inside the normal React tree — no second createRoot,
//  no flushSync, React 19 + SSR safe.
//
//  INFINITE LOOP FIX:
//  The previous version had useLayoutEffect with no dependency array, so it
//  ran after every commit. measure() called setHeightsMm + setMeasuring,
//  which triggered a re-render → commit → useLayoutEffect → measure() again
//  → infinite loop. Fixed by:
//    1. A `measuredRef` boolean that flips true after the first successful
//       measure and prevents measure() from firing again until items change.
//    2. useLayoutEffect depends on [itemCount, host] so it only re-runs when
//       the item list or host element actually changes.
//    3. The reset effect (on items.length change) flips measuredRef back to
//       false so the next change triggers a fresh measurement pass.
//
//  Public API — unchanged:
//    items          – array of data items to measure
//    renderItem     – (item, index) => ReactElement
//    contentWidthMm – PDF content area width in mm (default 182 for A4)
//
//  Returns { heightsMm, measuring, MeasurementPortal }
//    heightsMm         – parallel array of heights in mm (empty while measuring)
//    measuring         – true until all heights captured
//    MeasurementPortal – MUST be rendered somewhere in the same component's
//                        return value at all times (even after measuring=false)
// ─────────────────────────────────────────────────────────────────────────────

const MM_PER_PX = 25.4 / 96;

const isClient = typeof window !== "undefined";

let sharedHost: HTMLDivElement | null = null;

function getOrCreateHost(widthPx: number): HTMLDivElement {
  if (!sharedHost) {
    sharedHost = document.createElement("div");
    sharedHost.setAttribute("data-measurement-host", "true");
    sharedHost.setAttribute("aria-hidden", "true");
    document.body.appendChild(sharedHost);
  }
  sharedHost.style.cssText = [
    "position:absolute",
    "top:-99999px",
    "left:-99999px",
    `width:${widthPx}px`,
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-1",
    "font-size:16px",
    "line-height:1.5",
  ].join(";");
  return sharedHost;
}

export interface BlockHeightsResult {
  heightsMm: number[];
  measuring: boolean;
  MeasurementPortal: ReactElement | null;
}

export function useBlockHeights<T>(
  items: T[],
  renderItem: (item: T, index: number) => ReactElement,
  contentWidthMm = 182,
): BlockHeightsResult {
  const widthPx = (contentWidthMm / 25.4) * 96;

  // Create host eagerly in useState initializer so it exists on render #1.
  // On the server isClient is false → null (safe, no document access).
  const [host] = useState<HTMLDivElement | null>(() =>
    isClient ? getOrCreateHost(widthPx) : null,
  );

  const [heightsMm, setHeightsMm] = useState<number[]>([]);
  const [measuring, setMeasuring] = useState(items.length > 0);

  // Per-block div refs populated by React callback refs in the portal.
  const blockDivRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(items.length).fill(null),
  );

  // Guard: flips true after a successful measure; reset to false when
  // items.length changes so the next change triggers a fresh pass.
  const measuredRef = useRef(false);

  const renderItemRef = useRef(renderItem);
  renderItemRef.current = renderItem;

  // ── Sync host width ────────────────────────────────────────────────────────
  useEffect(() => {
    if (host) host.style.width = `${widthPx}px`;
  }, [host, widthPx]);

  // ── Reset when items list length changes ───────────────────────────────────
  useEffect(() => {
    if (!host) return;
    measuredRef.current = false;
    blockDivRefs.current = new Array(items.length).fill(null);
    if (items.length === 0) {
      setHeightsMm([]);
      setMeasuring(false);
    } else {
      setHeightsMm([]);
      setMeasuring(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ── Measure after React commits the portal children ───────────────────────
  // Depends on [items.length, host] — only re-runs when something meaningful
  // changed, not after every commit. measuredRef prevents measure() from
  // firing more than once per items-change even if the effect re-runs.
  useLayoutEffect(() => {
    if (!isClient || !host) return;
    if (items.length === 0) return;
    if (measuredRef.current) return; // already measured this batch — stop

    const allReady = blockDivRefs.current
      .slice(0, items.length)
      .every((el) => el !== null);
    if (!allReady) return;

    const measure = () => {
      if (measuredRef.current) return; // double-guard for the async image path
      measuredRef.current = true;
      const mm = blockDivRefs.current
        .slice(0, items.length)
        .map((div) => {
          if (!div) return 0;
          const h = div.getBoundingClientRect().height;
          return parseFloat((h * MM_PER_PX).toFixed(3));
        });
      setHeightsMm(mm);
      setMeasuring(false);
    };

    const imgs = Array.from(
      host.querySelectorAll<HTMLImageElement>("img"),
    ).filter((img) => !img.complete);

    if (imgs.length === 0) {
      measure();
    } else {
      let remaining = imgs.length;
      const onDone = () => { if (--remaining === 0) measure(); };
      imgs.forEach((img) => {
        img.addEventListener("load", onDone, { once: true });
        img.addEventListener("error", onDone, { once: true });
      });
    }
  // items.length and host are the only real triggers; measuredRef is a ref
  // (not state) so it doesn't need to be in deps.
  }, [items.length, host]);

  // ── Build portal with createElement (no JSX → valid in .ts) ──────────────
  let MeasurementPortal: ReactElement | null = null;

  if (host) {
    const wrappers = items.map((item, i) =>
      createElement(
        "div",
        {
          key: i,
          ref: (el: HTMLDivElement | null) => {
            blockDivRefs.current[i] = el;
          },
        },
        renderItemRef.current(item, i),
      ),
    );
    MeasurementPortal = createPortal(wrappers, host) as ReactElement;
  }

  return { heightsMm, measuring, MeasurementPortal };
}