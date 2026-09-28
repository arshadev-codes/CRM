import { useEffect, useRef, useState } from "react";
import { LoaderCircle, FileWarning } from "lucide-react";

// Renders the first page of a PDF onto a canvas, fitted inside its parent box.
// pdf.js is loaded on demand in the browser only (the app is server-rendered);
// the legacy build carries polyfills that current browsers still need.
export function PdfFirstPage({
  url,
  onRendered,
}: {
  url: string;
  onRendered?: (pageCount: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setState("loading");

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ url });
        cleanup = () => {
          void task.destroy();
        };
        const doc = await task.promise;
        const page = await doc.getPage(1);
        if (cancelled) return;

        const draw = async () => {
          const box = boxRef.current;
          const canvas = canvasRef.current;
          if (!box || !canvas) return;
          const base = page.getViewport({ scale: 1 });
          const fit = Math.min(box.clientWidth / base.width, box.clientHeight / base.height);
          const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
          const viewport = page.getViewport({ scale: fit * dpr });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
          await page.render({ canvas, viewport }).promise;
        };

        await draw();
        if (cancelled) return;
        setState("ready");
        onRendered?.(doc.numPages);

        let frame = 0;
        const observer = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            void draw().catch(() => undefined);
          });
        });
        if (boxRef.current) observer.observe(boxRef.current);
        const destroyDoc = cleanup;
        cleanup = () => {
          observer.disconnect();
          cancelAnimationFrame(frame);
          destroyDoc?.();
        };
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div ref={boxRef} className="relative grid h-full w-full place-items-center">
      <canvas
        ref={canvasRef}
        className={`rounded-lg bg-white shadow-[0_10px_30px_-12px_rgba(40,60,110,0.35)] transition-all duration-700 ease-out ${state === "ready" ? "scale-100 opacity-100 blur-0" : "scale-[0.97] opacity-0 blur-sm"}`}
      />
      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            Rendering drawing…
          </div>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <FileWarning className="h-8 w-8 text-destructive" />
            Could not preview this PDF
          </div>
        </div>
      )}
    </div>
  );
}
