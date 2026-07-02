import { createFileRoute } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { AllPages } from "@/components/pdf/AllPages";
import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";

export const Route = createFileRoute("/print/$id")({
  component: Print,
});

function Print() {
  const { id } = Route.useParams();
  const project = useProposalStore(s => s.projects.find(p => p.id === id));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    document.body.classList.add("print-mode");
    return () => document.body.classList.remove("print-mode");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = document.querySelector('[data-pdf-settled]');
      if (el?.getAttribute("data-pdf-settled") === "true") {
        setSettled(true);
        clearInterval(interval);
      }
    }, 300);
    const fallback = setTimeout(() => { setSettled(true); clearInterval(interval); }, 8000);
    return () => { clearInterval(interval); clearTimeout(fallback); };
  }, []);

  if (!project) return <div style={{ padding: 40 }}>Project not found.</div>;

  return (
    <>
      {/* Floating toolbar */}
      <div className="print:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Print instructions banner */}
        {/* <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 max-w-xs shadow-lg">
          <div className="font-semibold mb-1">⚠ Before printing:</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Set <strong>Margins → None</strong></li>
            <li>Set <strong>Scale → 100%</strong></li>
            <li>Uncheck <strong>Headers & footers</strong></li>
            <li>Check <strong>Background graphics</strong></li>
          </ol>
        </div>  */}

        <div className="flex gap-2">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-lg text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="h-4 w-4" />
            Close
          </button>
          <button
            disabled={!settled}
            onClick={() => window.print()}
            className={`flex items-center gap-2 px-5 py-2 rounded-full shadow-lg text-sm font-medium transition
              ${settled
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-blue-300 text-white cursor-not-allowed"
              }`}
          >
            <Printer className="h-4 w-4" />
            {settled ? "Print / Save as PDF" : "Preparing…"}
          </button>
        </div>
      </div>

      <div className="bg-white">
        <AllPages project={project} />
      </div>
    </>
  );
}