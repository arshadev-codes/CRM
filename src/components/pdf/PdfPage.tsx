import logoUrl from "@/assets/electrosoft-logo.png";
import { createContext, useContext, type ReactNode } from "react";

// Lets the top-level AllPages provider broadcast the final total page count
// so every footer shows "Page X of <real total>" regardless of how many
// dynamically-paginated sections (Subsystems, Scope of Supply, Terms) expand.
const TotalPagesContext = createContext<number | undefined>(undefined);
export function TotalPagesProvider({ value, children }: { value: number; children: ReactNode }) {
  return <TotalPagesContext.Provider value={value}>{children}</TotalPagesContext.Provider>;
}

interface Props {
  pageNumber: number;
  totalPages?: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

// A4 page frame — 210mm × 297mm with internal padding matched to the Electrosoft proposal.
// Every block inside should use `style={{ breakInside: 'avoid' }}` (or the .pdf-block class)
// so Puppeteer never splits a logical unit across pages.
export function PdfPage({ pageNumber, totalPages, header, footer, children }: Props) {
  const ctxTotal = useContext(TotalPagesContext);
  const total = totalPages ?? ctxTotal ?? 24;
  return (
    <div
      className="pdf-page bg-white text-slate-900 mx-auto shadow-md print:shadow-none mb-6 print:mb-0 flex flex-col"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "12mm 14mm 14mm 14mm",
        boxSizing: "border-box",
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      <PdfHeader>{header}</PdfHeader>
      <div className="pt-3 flex-1 overflow-hidden">{children}</div>
      <PdfFooter pageNumber={pageNumber} totalPages={total}>{footer}</PdfFooter>
    </div>
  );
}

export function PdfHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-blue-700 pb-2">
      <img src={logoUrl} alt="Electrosoft Automation Pvt. Ltd." style={{ height: "12mm" }} />
      <div className="text-right text-[10px] text-slate-700">
        {children ?? (
          <>
            <div className="font-semibold">Techno-commercial</div>
            <div>Proposal</div>
          </>
        )}
      </div>
    </div>
  );
}

export function PdfFooter({
  pageNumber,
  totalPages,
  children,
}: {
  pageNumber: number;
  totalPages: number;
  children?: ReactNode;
}) {
  return (
    <div className="border-t border-slate-300 pt-2 mt-3 text-[8.5px] text-slate-500 flex items-end justify-between">
      <div className="leading-snug">
        {children ?? (
          <>
            <div>a: S7-1, Jai Matadi Compound, Kalher, Thane, Maharashtra, INDIA 421302</div>
            <div>e: info@electrosoftindia.com &nbsp; GST: 27AAFCE4353G1ZP</div>
            <div>m: +91-9089-888-444 &nbsp; CIN: U31900MH2019PTC323431</div>
          </>
        )}
      </div>
      <div className="whitespace-nowrap">Page {pageNumber} of {totalPages}</div>
    </div>
  );
}
