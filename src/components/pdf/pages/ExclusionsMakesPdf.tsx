import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { exclusionsData } from "@/data/exclusionsData";
import { makesOfSupplyData } from "@/data/makesOfSupplyData";

// Page: LIST OF EXCLUSIONS + MAKES OF SUPPLY — auto-built from project state.
export function ExclusionsMakesPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const selectedExclusionIds = new Set(project.data.exclusions);
  const excl = exclusionsData.filter((e) => selectedExclusionIds.has(e.id));
  const makes = project.data.makes.filter((m) => m.enabled).map((m) => {
    const ref = makesOfSupplyData.find((d) => d.id === m.id);
    return { item: ref?.label ?? m.id, make: m.custom || m.make || ref?.defaultMake || "—" };
  });

  return (
    <PdfPage pageNumber={pageNumber}>
      <div style={{ breakInside: "avoid" }}>
        <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1 font-bold text-[11px] text-slate-800">
          LIST OF EXCLUSIONS
        </div>
        <p className="text-[10px] text-slate-700 mt-2">
          The following items are explicitly excluded from Electrosoft's scope of supply unless agreed in writing:
        </p>
        <ol className="mt-2 list-decimal pl-6 text-[10px] space-y-0.5">
          {excl.length === 0 ? (
            <li className="italic text-slate-400">No exclusions selected.</li>
          ) : excl.map((e) => <li key={e.id}>{e.title}</li>)}
        </ol>
      </div>

      <div className="mt-5" style={{ breakInside: "avoid" }}>
        <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1 font-bold text-[11px] text-slate-800">
          MAKES OF SUPPLY
        </div>
        <table className="w-full text-[10px] mt-2 border border-slate-300">
          <thead className="bg-slate-50">
            <tr>
              <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
              <th className="border border-slate-300 p-1.5 text-left">Item</th>
              <th className="border border-slate-300 p-1.5 text-left w-56">Make</th>
            </tr>
          </thead>
          <tbody>
            {makes.length === 0 ? (
              <tr><td colSpan={3} className="border p-2 text-center italic text-slate-400">— No makes selected —</td></tr>
            ) : makes.map((m, i) => (
              <tr key={i}>
                <td className="border border-slate-300 p-1.5">{i + 1}</td>
                <td className="border border-slate-300 p-1.5">{m.item}</td>
                <td className="border border-slate-300 p-1.5">{m.make}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PdfPage>
  );
}
