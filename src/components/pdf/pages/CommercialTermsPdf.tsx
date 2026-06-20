import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";

// COMMERCIAL TERMS page — price summary, freight, validity, payment terms,
// warranty and on-site service rates. Mirrors page ~19-20 of the reference PDF.
export function CommercialTermsPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const buyer = project.data.customer.companyFullName || "Buyer";
  const city = project.data.customer.city || "Site location";
  const payment = project.data.payment ?? [];

  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[12px] font-bold text-blue-800 uppercase tracking-wide">
        Commercial Terms
      </h2>

      <Section title="Pricing">
        <p>All prices are quoted in INR, exclusive of GST and any other applicable statutory levies.</p>
        <p className="mt-1">Detailed price breakdown is shared separately as part of the commercial annexure.</p>
      </Section>

      <Section title="Freight &amp; Logistics">
        <KV k="Freight charges" v="Inclusive" />
        <KV k="Destination" v={city} />
        <KV k="Mode of Transport" v="By Road" />
        <KV k="Incoterms" v="CFR (Cost &amp; Freight)" />
        <KV k="Transit Insurance" v={`Not in our scope. ${buyer} may insure the shipment at their discretion if desired.`} />
        <p className="text-[10px] mt-1">Our liability ends once the goods leave our factory premises.</p>
      </Section>

      <Section title="Offer Validity">
        <p>30 days from the date of this offer.</p>
      </Section>

      <Section title="Payment Terms — Supply of Material">
        <ul className="list-disc pl-5 space-y-0.5">
          {payment.map((m) => (
            <li key={m.id}><strong>{m.percent}%</strong> — {m.label}</li>
          ))}
        </ul>
      </Section>

      <Section title="Payment Terms — On-site Services">
        <p>50% advance for mobilisation of personnel. Balance immediately after successful commissioning.</p>
      </Section>

      <Section title="Warranty">
        <p>12 months from the date of commissioning or 18 months from the date of dispatch, whichever is earlier. Extended warranty and AMC can be quoted separately upon request.</p>
      </Section>

      <Section title="On-site Services">
        <p>Onsite services if delayed beyond specified man-days due to site condition, will be chargeable extra @ Rs. 15,000/- per man-day. During the on-site period for commissioning, lodging and boarding of engineer(s) must be arranged by {buyer}.</p>
      </Section>
    </PdfPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4" style={{ breakInside: "avoid" }}>
      <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1 font-bold text-[11px] text-slate-800">
        {title}
      </div>
      <div className="text-[10px] mt-2 leading-relaxed">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex text-[10px] gap-2">
      <span className="w-40 font-semibold">{k}:</span>
      <span className="flex-1" dangerouslySetInnerHTML={{ __html: v }} />
    </div>
  );
}
