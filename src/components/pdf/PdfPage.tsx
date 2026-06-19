import logoUrl from "@/assets/electrosoft-logo.png";
import type { ReactNode } from "react";

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
export function PdfPage({ pageNumber, totalPages = 24, header, footer, children }: Props) {
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
      <PdfFooter pageNumber={pageNumber} totalPages={totalPages}>{footer}</PdfFooter>
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
