import { PdfPage } from "../PdfPage";
import { makeMoney } from "@/data/currency";
import type { Project } from "@/store/proposalStore";
import {
  freightLogisticsDefaults,
  type FreightLogisticsData,
} from "@/data/freightLogisticsData";

// COMMERCIAL TERMS page — price bid table, freight & logistics table, validity,
// payment terms, warranty and on-site service rates.
//
// NOTE ON STYLING: Puppeteer's print rendering strips background colors and can
// re-inherit text color unless `print-color-adjust: exact` is active *and* loaded
// before the page is rendered. Rather than depend on a global stylesheet, this
// component ships its own scoped <style> fix and uses explicit inline hex colors
// (matching your existing blue-900 / slate-100 / blue-700 theme) instead of
// relying on Tailwind utility classes surviving the PDF pipeline.

const resolvePreset = (value: string, custom?: string) => (value === "Custom" ? (custom ?? "") : value);

function resolveTransitInsurance(fl: FreightLogisticsData, buyer: string) {
  if (fl.transitInsurance === "Custom") return fl.transitInsuranceCustom ?? "";
  if (fl.transitInsurance === freightLogisticsDefaults.transitInsurance) {
    return `Not in our scope. ${buyer} may insure the shipment at their discretion if desired.`;
  }
  return fl.transitInsurance;
}


// ── theme (matches the rest of your PDF: blue-900/800/700, slate-300/100/50) ──
const THEME = {
  headerBg: "#dbeafe",   // blue-100
  totalBg: "#f1f5f9",    // slate-100
  labelBg: "#f8fafc",    // slate-50
  border: "#cbd5e1",     // slate-300
  textDark: "#1e3a8a",   // blue-900
  textMid: "#1e40af",    // blue-800
  black: "#0f172a",      // slate-900, near-black
};

const cellBase: React.CSSProperties = {
  border: `1px solid ${THEME.border}`,
  padding: "6px",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  colorAdjust: "exact",
} as React.CSSProperties;

export function CommercialTermsPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const buyer = project.data.customer.companyFullName || "Buyer";
  const payment = project.data.payment ?? [];

  const fl: FreightLogisticsData = project.data.freightLogistics ?? {
    ...freightLogisticsDefaults,
    destination: project.data.customer.city || "Site location",
  };

  const pricing = project.data.pricing;
  const money = makeMoney(project.data.currency);
  const inr = (n: number) => (n > 0 ? money.fromInr(n) : "---");
  const sumEntries = (entries?: Record<string, { unitPrice: string; qty: string }>) =>
    Object.values(entries ?? {}).reduce((sum, e) => sum + (Number(e.unitPrice) || 0) * (Number(e.qty) || 0), 0);
  const sumServices = (services?: Record<string, string>) =>
    Object.values(services ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const priceA = sumEntries(pricing?.scopeOfSupply);
  const priceB = sumEntries(pricing?.instruments);
  const priceC = sumEntries(pricing?.equipment);
  const priceD = sumServices(pricing?.scopeOfServices);
  const grandTotal = priceA + priceB + priceC + priceD;

  const { rating, ratingUnit, voltage, voltageUnit } = project.data.transformer;

  const priceBidRows = [
    {
      key: "A",
      description: `Supply of Advanced Transformer Testing System for ${rating || "—"} ${ratingUnit}, ${voltage || "—"} ${voltageUnit} Transformers, comprising all instruments, equipment and scope of supply items as detailed in this proposal.`,
      qty: 1,
      price: priceA,
    },
    {
      key: "B",
      description: "Supply of testing instruments as listed under the Testing Instruments section of this proposal, including all accessories required for accurate testing of the transformer.",
      qty: 1,
      price: priceB,
    },
    {
      key: "C",
      description: "Supply of other equipment as listed under the Equipment section of this proposal, required to support installation, testing and commissioning.",
      qty: 1,
      price: priceC,
    },
    {
      key: "D",
      description: "On-site services including supervision of installation, commissioning, training and other services as detailed under Scope of Services.",
      qty: 1,
      price: priceD,
    },
  ];

  return (
    <PdfPage pageNumber={pageNumber}>
      {/* Scoped print-color fix — ships with this page, no global CSS dependency.
          These are real stylesheet rules with !important, not inline style props,
          because inline `style={{}}` cannot carry !important and loses to any
          global print reset that uses it (which is what was overriding the
          previous version's colors/bold). */}
      <style>{`
        .commercial-terms-page, .commercial-terms-page * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .commercial-terms-page .ct-black {
          color: #000000 !important;
        }
        .commercial-terms-page .ct-bold {
          font-weight: 700 !important;
        }
        .commercial-terms-page table.ct-table th,
        .commercial-terms-page table.ct-table td {
          color: #000000 !important;
        }
        .commercial-terms-page table.ct-table th {
          font-weight: 700 !important;
        }
      `}</style>

      <div className="commercial-terms-page">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: THEME.textDark, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Commercial Terms
        </h2>

        <Section title="Pricing">
          <p style={{ color: THEME.black }}>All prices are quoted in {money.code}, exclusive of GST and any other applicable statutory levies.</p>

          <table className="ct-table" style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th className="ct-bold ct-black" style={{ ...cellBase, width: 40, background: THEME.headerBg }}>Sr. No</th>
                <th className="ct-bold ct-black" style={{ ...cellBase, textAlign: "left", background: THEME.headerBg }}>Description</th>
                <th className="ct-bold ct-black" style={{ ...cellBase, width: 70, background: THEME.headerBg }}>Quantity</th>
                <th className="ct-bold ct-black" style={{ ...cellBase, width: 100, background: THEME.headerBg }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {priceBidRows.map(r => (
                <tr key={r.key}>
                  <td className="ct-bold ct-black" style={{ ...cellBase, textAlign: "center" }}>{r.key}</td>
                  <td className="ct-black" style={{ ...cellBase }}>{r.description}</td>
                  <td className="ct-black" style={{ ...cellBase, textAlign: "center" }}>{r.qty}</td>
                  <td className="ct-black" style={{ ...cellBase, textAlign: "center" }}>{inr(r.price)}</td>
                </tr>
              ))}
              <tr>
                <td className="ct-bold ct-black" style={{ ...cellBase, textAlign: "center", background: THEME.totalBg }} colSpan={3}>
                  Total (A + B + C + D)
                </td>
                <td className="ct-bold ct-black" style={{ ...cellBase, textAlign: "center", background: THEME.totalBg }}>
                  {inr(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Freight &amp; Logistics">
          <table className="ct-table" style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <tbody>
              <Row k="Freight Charges" v={fl.freightCharges} />
              <Row k="Destination" v={fl.destination} />
              <Row k="Source (Dispatch Location)" v={resolvePreset(fl.source, fl.sourceCustom)} />
              <Row k="Mode of Transport" v={resolvePreset(fl.modeOfTransport, fl.modeOfTransportCustom)} />
              <Row k="Incoterms" v={resolvePreset(fl.incoterms, fl.incotermsCustom)} />
              <Row k="Transit Insurance" v={resolveTransitInsurance(fl, buyer)} />
            </tbody>
          </table>
          <p style={{ fontSize: 13, marginTop: 8, color: THEME.black }}>{fl.liabilityNote}</p>
        </Section>

        <Section title="Offer Validity">
          <p style={{ color: THEME.black }}>30 days from the date of this offer.</p>
        </Section>

        <Section title="Payment Terms — Supply of Material">
          <ul style={{ listStyle: "disc", paddingLeft: 20, color: THEME.black }}>
            {payment.map((m) => (
              <li key={m.id} style={{ marginBottom: 2 }}><strong>{m.percent}%</strong> — {m.label}</li>
            ))}
          </ul>
        </Section>

        <Section title="Payment Terms — On-site Services">
          <p style={{ color: THEME.black }}>50% advance for mobilisation of personnel. Balance immediately after successful commissioning.</p>
        </Section>

        <Section title="Warranty">
          <p style={{ color: THEME.black }}>12 months from the date of commissioning or 18 months from the date of dispatch, whichever is earlier. Extended warranty and AMC can be quoted separately upon request.</p>
        </Section>

        <Section title="On-site Services">
          <p style={{ color: THEME.black }}>Onsite services if delayed beyond specified man-days due to site condition, will be chargeable extra @ Rs. 15,000/- per man-day. During the on-site period for commissioning, lodging and boarding of engineer(s) must be arranged by {buyer}.</p>
        </Section>
      </div>
    </PdfPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, breakInside: "avoid" }}>
      <div style={{
        background: THEME.totalBg,
        borderLeft: `4px solid ${THEME.textMid}`,
        padding: "4px 12px",
        fontWeight: 700,
        fontSize: 13.5,
        color: "#1e293b",
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="ct-bold ct-black" style={{ ...cellBase, width: 180, background: THEME.labelBg }}>{k}</td>
      <td className="ct-black" style={{ ...cellBase }}>{v}</td>
    </tr>
  );
}