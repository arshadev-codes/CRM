import logoUrl from "@/assets/electrosoft-logo.png";
import { createContext, useContext, type ReactNode } from "react";

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

// A4 = 297mm tall. Breakdown:
//   top padding:     12mm
//   bottom padding:  14mm
//   header:          ~14mm  (logo 12mm + 2mm border/gap)
//   footer:          ~10mm  (text lines + border)
//   pt-3 gap:         3mm
//   remaining for content: ~297 - 12 - 14 - 14 - 10 - 3 = ~244mm
export function PdfPage({ pageNumber, totalPages, header, footer, children }: Props) {
  const ctxTotal = useContext(TotalPagesContext);
  const total = totalPages ?? ctxTotal ?? 24;
  return (
    <div
      className="pdf-page bg-white text-slate-900 mx-auto shadow-md print:shadow-none mb-6 print:mb-0"
      style={{
        width: "210mm",
        height: "297mm",
        minHeight: "297mm",
        maxHeight: "297mm",
        paddingTop: "12mm",
        paddingBottom: "14mm",
        paddingLeft: "14mm",
        paddingRight: "14mm",
        boxSizing: "border-box",
        pageBreakAfter: "always",
        breakAfter: "page",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header — fixed height, never shrinks */}
      <div style={{ flexShrink: 0 }}>
        <PdfHeader>{header}</PdfHeader>
      </div>

      {/* Content — takes remaining space, clips overflow so nothing bleeds out */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          paddingTop: "6px",
          minHeight: 0, // critical: allows flex child to shrink below content size
        }}
      >
        {children}
      </div>

      {/* Footer — fixed height, never shrinks, always anchored at bottom */}
      <div style={{ flexShrink: 0 }}>
        <PdfFooter pageNumber={pageNumber} totalPages={total}>{footer}</PdfFooter>
      </div>
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
    <div className="border-t border-slate-300 pt-2 mt-2 text-[8.5px] text-slate-500 flex items-end justify-between">
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