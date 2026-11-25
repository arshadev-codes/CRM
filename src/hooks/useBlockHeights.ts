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
//  Measures the real rendered height of each content block (in a hidden
//  portal on <body>) so PDF sections can be split into pages without clipping.
//
//  Measurement is keyed on a SIGNATURE of the items, not just their count:
//  whenever the content changes (a subsystem ticked, a variant switched, the
//  shared library arriving from the database, text edited), the blocks are
//  measured again. The previous version only re-measured when the number of
//  items changed and, after the first change, never finished measuring again,
//  so the section (e.g. the Scope of Supply pricing table) stayed hidden until
//  the page was reloaded.
//
//  While a new measurement is running, the last heights are reused when the
//  item count still matches, so the section never blinks out.
//
//  Returns { heightsMm, measuring, settled, MeasurementPortal }
//    heightsMm         – heights in mm, one per item (empty while measuring)
//    measuring         – true while no usable heights exist yet
//    settled           – true once the heights match the current items
//    MeasurementPortal – must always be rendered by the calling component
// ─────────────────────────────────────────────────────────────────────────────

const MM_PER_PX = 25.4 / 96;
/** Images that never fire load/error must not block the PDF forever. */
const IMAGE_WAIT_MS = 4000;

const isClient = typeof window !== "undefined";

let sharedHost: HTMLDivElement | null = null;

function getOrCreateHost(widthPx: number): HTMLDivElement {
  if (!sharedHost || !sharedHost.isConnected) {
    sharedHost = document.createElement("div");
    sharedHost.setAttribute("data-measurement-host", "true");
    sharedHost.setAttribute("aria-hidden", "true");
    document.body.appendChild(sharedHost);
  }
  sharedHost.style.cssText = [
    "position:absolute",
    "top:-99999px",
    "left:-99999px",
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-1",
    "font-size:16px",
    "line-height:1.5",
  ].join(";");
  void widthPx;
  return sharedHost;
}

/**
 * Cheap, stable fingerprint of the items. Long strings (images as data URLs)
 * are shortened to their length and ends, so this stays fast.
 */
export function itemsSignature(items: unknown): string {
  try {
    return JSON.stringify(items, (_k, v) =>
      typeof v === "string" && v.length > 200 ? `${v.length}:${v.slice(0, 60)}:${v.slice(-60)}` : v,
    );
  } catch {
    return String(Math.random());
  }
}

export interface BlockHeightsResult {
  heightsMm: number[];
  measuring: boolean;
  settled: boolean;
  MeasurementPortal: ReactElement | null;
}

export function useBlockHeights<T>(
  items: T[],
  renderItem: (item: T, index: number) => ReactElement,
  contentWidthMm = 182,
  /** Pass when the rendering depends on more than the items (e.g. the currency). */
  extraSignature = "",
): BlockHeightsResult {
  const widthPx = (contentWidthMm / 25.4) * 96;
  const sig = `${contentWidthMm}|${extraSignature}|${itemsSignature(items)}`;

  // null on the server and on the first client render (no DOM access during render).
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<{ sig: string; heights: number[] } | null>(null);

  const blockDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingSig = useRef<string | null>(null);

  useEffect(() => {
    if (!isClient) return;
    setHost(getOrCreateHost(widthPx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs after every commit, but does work only when the items changed since
  // the last measurement and the portal for them is in the page.
  useLayoutEffect(() => {
    if (!isClient || !host) return;
    if (items.length === 0) return;
    if (measured?.sig === sig || pendingSig.current === sig) return;

    const els = blockDivRefs.current.slice(0, items.length);
    if (els.length < items.length || els.some((el) => !el)) return;

    pendingSig.current = sig;
    const capture = () => {
      if (pendingSig.current !== sig) return; // items changed again meanwhile
      pendingSig.current = null;
      const heights = blockDivRefs.current.slice(0, items.length).map((div) => {
        if (!div) return 0;
        return parseFloat((div.getBoundingClientRect().height * MM_PER_PX).toFixed(3));
      });
      setMeasured({ sig, heights });
    };

    const imgs = els.flatMap((el) => Array.from(el!.querySelectorAll("img"))).filter((img) => !img.complete);
    if (imgs.length === 0) {
      capture();
      return;
    }
    let remaining = imgs.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      capture();
    };
    const timer = setTimeout(finish, IMAGE_WAIT_MS);
    const onDone = () => { if (--remaining <= 0) finish(); };
    imgs.forEach((img) => {
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
    });
  });

  const fresh = measured?.sig === sig;
  const usable =
    items.length === 0
      ? []
      : fresh
        ? measured!.heights
        : measured && measured.heights.length === items.length
          ? measured.heights
          : null;

  let MeasurementPortal: ReactElement | null = null;
  if (host) {
    const wrappers = createElement(
      "div",
      { style: { width: `${widthPx}px` } },
      items.map((item, i) =>
        createElement(
          "div",
          {
            key: i,
            ref: (el: HTMLDivElement | null) => {
              blockDivRefs.current[i] = el;
            },
          },
          renderItem(item, i),
        ),
      ),
    );
    MeasurementPortal = createPortal(wrappers, host) as ReactElement;
  }

  return {
    heightsMm: usable ?? [],
    measuring: usable === null,
    settled: items.length === 0 || fresh,
    MeasurementPortal,
  };
}
