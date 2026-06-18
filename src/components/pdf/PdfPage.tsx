import type { ReactNode } from "react";

interface Props {
  pageNumber: number;
  totalPages?: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

// A4 page frame: 210mm x 297mm with internal padding matching forensic measurements.
// Header band ~25mm, footer band ~15mm. Body fills the rest.
export function PdfPage({ pageNumber, totalPages = 24, header, footer, children }: Props) {
  return (
    <div className="pdf-page bg-white text-slate-900 mx-auto shadow-md print:shadow-none mb-6 print:mb-0"
      style={{ width: "210mm", minHeight: "297mm", padding: "12mm 14mm 14mm 14mm", boxSizing: "border-box" }}>
      <PdfHeader>{header}</PdfHeader>
      <div className="pt-3" style={{ minHeight: "240mm" }}>
        {children}
      </div>
      <PdfFooter pageNumber={pageNumber} totalPages={totalPages}>{footer}</PdfFooter>
    </div>
  );
}

export function PdfHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-blue-700 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded bg-blue-700 text-white grid place-items-center font-bold text-sm">ES</div>
        <div>
          <div className="font-semibold text-[11px] text-blue-800 leading-tight">Electrosoft Automation Pvt. Ltd.</div>
          <div className="text-[8.5px] text-slate-500">Transforming Transformer Testing</div>
        </div>
      </div>
      <div className="text-right text-[9.5px] text-slate-600">
        {children ?? <><div className="font-medium">Techno-commercial</div><div>Proposal</div></>}
      </div>
    </div>
  );
}

export function PdfFooter({ pageNumber, totalPages, children }: { pageNumber: number; totalPages: number; children?: ReactNode }) {
  return (
    <div className="border-t border-slate-300 pt-2 mt-4 text-[8.5px] text-slate-500 italic flex items-center justify-between">
      <div>{children ?? "Electrosoft Automation Pvt. Ltd. — Confidential"}</div>
      <div>Page {pageNumber} of {totalPages}</div>
    </div>
  );
}
