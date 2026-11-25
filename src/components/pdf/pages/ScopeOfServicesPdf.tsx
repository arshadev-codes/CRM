import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { useLibrary } from "@/hooks/useLibrary";
import { makeMoney, type Money } from "@/data/currency";
import { getOnSiteServiceRows } from "@/data/scopeOfServiceRows";
import { servicePriceInr } from "@/data/quotationPricing";
import { useShowPrices } from "../offerType";

// Key of the additional-warranty row (see getOnSiteServiceRows).
const ADDITIONAL_WARRANTY_KEY = "additional-warranty";

/** True when the quotation has on-site services to print. */
export const hasServiceRows = (project: Project, proprietary: Parameters<typeof getOnSiteServiceRows>[1]) =>
  getOnSiteServiceRows(project, proprietary).length > 0;

/**
 * ELECTROSOFT'S SCOPE OF SERVICES page: the on-site services table, the
 * additional warranty and (unless `withDelivery` is false, as in the Commercial
 * Offer, where it has its own page) the delivery schedule.
 */
export function ScopeOfServicesPdf({
  project,
  pageNumber,
  withDelivery = true,
}: {
  project: Project;
  pageNumber: number;
  withDelivery?: boolean;
}) {
  const showPrices = useShowPrices();
  const proprietaryItems = useLibrary("proprietary");
  const allOnsiteRows = getOnSiteServiceRows(project, proprietaryItems);
  const money = makeMoney(project.data.currency);
  const price = (key: string) => {
    const inr = servicePriceInr(project, key);
    return inr > 0 ? inr : null;
  };

  // Additional Warranty is printed as its own table below the on-site one.
  const onsiteRows = allOnsiteRows.filter((r) => r.key !== ADDITIONAL_WARRANTY_KEY);
  const warrantyMonths = project.data.additionalWarrantyMonths;
  const warrantyRow = allOnsiteRows.find((r) => r.key === ADDITIONAL_WARRANTY_KEY);

  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-800 uppercase tracking-wide">
        Electrosoft's Scope of Services
      </h2>

      <div className="mt-4" />

      <OnSiteTable
        money={money}
        showPrices={showPrices}
        title="ON-SITE"
        rows={onsiteRows.map((r, i) => ({ sr: i + 1, desc: r.description, priceInr: price(r.key) }))}
      />

      {warrantyMonths && warrantyRow && (
        <div className="mt-4">
          <OnSiteTable
            money={money}
            showPrices={showPrices}
            title="ADDITIONAL WARRANTY"
            rows={[
              {
                sr: 1,
                desc: `Additional Warranty — ${warrantyMonths} month${warrantyMonths === 1 ? "" : "s"} beyond the standard 12-month warranty period.`,
                priceInr: price(ADDITIONAL_WARRANTY_KEY),
              },
            ]}
          />
        </div>
      )}

      {withDelivery && (
        <div className="mt-5">
          <DeliveryScheduleBlock project={project} />
        </div>
      )}
    </PdfPage>
  );
}

/** DELIVERY SCHEDULE on a page of its own (Commercial Offer). */
export function DeliverySchedulePdf({ project, pageNumber }: { project: Project; pageNumber: number }) {
  return (
    <PdfPage pageNumber={pageNumber}>
      <DeliveryScheduleBlock project={project} />
    </PdfPage>
  );
}

function DeliveryScheduleBlock({ project }: { project: Project }) {
  return (
    <div style={{ breakInside: "avoid" }}>
      <div className="bg-blue-900   border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-white">
        DELIVERY SCHEDULE
      </div>
      <table className="w-full text-[13px] border border-slate-300">
        <thead className="bg-blue-100">
          <tr>
            <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
            <th className="border border-slate-300 p-1.5 text-left">Details</th>
            <th className="border border-slate-300 p-1.5 text-left w-40">Duration</th>
          </tr>
        </thead>
        <tbody>
          {project.data.delivery.map((d, i) => (
            <tr key={d.id}>
              <td className="border border-slate-300 p-1.5">{i + 1}</td>
              <td className="border border-slate-300 p-1.5">{d.deliverable}</td>
              <td className="border border-slate-300 p-1.5">{d.duration === "Custom" ? d.custom || "Custom" : d.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[13.5px] mt-4">
        <div className="font-semibold">Note:</div>
        <ol className="list-decimal pl-5 mt-1 space-y-0.5">
          <li>Schedule is subject to timely purchase order, advance payment and approval of GA, Wiring diagram, technical specification of all items.</li>
          <li>{project.data.customer.companyFullName || "the Buyer"} shall provide necessary site readiness, manpower and inputs as required for on-site activities.</li>
        </ol>
      </div>
    </div>
  );
}

// On-site table: Sr. No / Description / Price — NO quantity column.
function OnSiteTable({
  title,
  rows,
  money,
  showPrices,
}: {
  title: string;
  rows: { sr: number; desc: string; priceInr: number | null }[];
  money: Money;
  showPrices: boolean;
}) {
  const totalInr = rows.reduce((sum, r) => sum + (r.priceInr ?? 0), 0);
  return (
    <div style={{ breakInside: "avoid" }}>
      <div className="bg-blue-900   border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-white    mt-3">
        {title}
      </div>
      <table className="w-full text-[13px]  border border-slate-300">
        <thead className="bg-blue-100">
          <tr>
            <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
            <th className="border border-slate-300 p-1.5 text-left">Description</th>
            {showPrices && <th className="border border-slate-300 p-1.5 text-right w-28">Price ({money.code})</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="border p-2 text-center italic text-slate-400" colSpan={showPrices ? 3 : 2}>— None selected —</td></tr>
          ) : (
            <>
              {rows.map((r) => (
                <tr key={r.sr}>
                  <td className="border border-slate-300 p-1.5">{r.sr}</td>
                  <td className="border border-slate-300 p-1.5">{r.desc}</td>
                  {showPrices && (
                    <td className="border border-slate-300 p-1.5 text-right">{r.priceInr != null ? money.fromInr(r.priceInr) : "---"}</td>
                  )}
                </tr>
              ))}
              {showPrices && (
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-300 p-1.5 text-right" colSpan={2}>Total</td>
                  <td className="border border-slate-300 p-1.5 text-right text-blue-900">{money.fromInr(totalInr)}</td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
