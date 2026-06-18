import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { scopeOfSupplyData } from "@/data/scopeOfSupplyData";

export function ScopeOfSupplyPdf({ project, pageNumber = 15 }: { project: Project; pageNumber?: number }) {
  const { selectedSubsystems, instruments, equipment, proprietary } = project.data;
  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[14px] font-bold text-blue-800 border-b border-blue-200 pb-1">Scope of Supply</h2>
      <table className="w-full text-[9.5px] mt-3 border border-slate-300">
        <thead className="bg-slate-100">
          <tr><th className="border border-slate-300 p-1.5 text-left w-12">Sr.</th>
              <th className="border border-slate-300 p-1.5 text-left">Item</th>
              <th className="border border-slate-300 p-1.5 text-left w-20">Qty</th></tr>
        </thead>
        <tbody>
          {scopeOfSupplyData.filter(s => s.defaultIncluded).map((s, i) => (
            <tr key={s.id}><td className="border border-slate-300 p-1.5">{i+1}</td>
              <td className="border border-slate-300 p-1.5">{s.title}</td>
              <td className="border border-slate-300 p-1.5">1 Lot</td></tr>
          ))}
        </tbody>
      </table>
      <h3 className="text-[12px] font-bold text-blue-800 mt-4">Major Sub-Systems Included ({selectedSubsystems.length})</h3>
      <p className="text-[9.5px] mt-1">{selectedSubsystems.join(", ")}</p>
      <h3 className="text-[12px] font-bold text-blue-800 mt-3">Instruments: {instruments.length} items</h3>
      <h3 className="text-[12px] font-bold text-blue-800 mt-1">Equipment: {equipment.filter(e=>e.included).length} items</h3>
      <h3 className="text-[12px] font-bold text-blue-800 mt-1">Proprietary Items: {proprietary.length}</h3>
    </PdfPage>
  );
}
