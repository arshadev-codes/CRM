// Full General Terms & Conditions, extracted from the reference ATTS proposal.
// User-editable via Settings later if needed; for now treated as static content
// rendered by TermsPdf with automatic pagination (no orphan/widow splits).
export interface TermsClause {
  n: string;       // "1", "2", "11.4", "16.1" …
  title?: string;  // optional sub-clause heading (e.g. "Definitions")
  body?: string;
  bullets?: string[];
}

export const termsEffectiveDate = "24ᵗʰ November 2025";
export const termsIntro =
  `Company: Electrosoft Automation Pvt. Ltd. (hereinafter referred to as "Seller")\n\n` +
  `These Terms and Conditions shall apply to all quotations, offers, purchase orders, order confirmations, sales, and deliveries made by the Seller to its customers (hereinafter referred to as "Buyer"), unless otherwise agreed in writing. The Buyer's acceptance of a quotation or placement of a purchase order constitutes agreement to the following Terms and Conditions:`;

export const termsClauses: TermsClause[] = [
  { n: "1", title: "Definitions", bullets: [
      "Seller: Electrosoft Automation Pvt. Ltd.",
      "Buyer: The individual or entity issuing a purchase order or accepting an offer.",
      "Goods: Any product, component, equipment, or service offered or sold by Seller.",
      "Contract: The contract for sale and purchase of Goods, comprising the Seller's quotation and these General Terms & Conditions, and any mutually agreed special terms in writing.",
    ]},
  { n: "2", title: "Offer Validity",
    body: `Unless otherwise specified, Seller's offer shall remain valid for a period of 30 (thirty) calendar days from the date of the offer. Seller reserves the right to revise or withdraw the offer prior to its acceptance.` },
  { n: "3", title: "Scope and Precedence of Terms" },
  { n: "3.1", body: `These General Terms & Conditions (T&C) shall apply to all contracts unless explicitly waived or modified in writing by Seller.` },
  { n: "3.2", body: `Any terms and conditions stated in Buyer's purchase order or communication that are inconsistent with, contrary to, or in addition to these T&C shall be deemed null and void unless expressly accepted in writing by the Seller.` },
  { n: "3.3", body: `In the event of any conflict, these Terms & Conditions shall prevail over any terms contained in Buyer's documents, including but not limited to purchase orders, unless specifically acknowledged and agreed by the Seller in writing.` },
  { n: "4", title: "Pricing" },
  { n: "4.1", body: `All prices quoted are ex-works (EXW), exclusive of taxes, duties, freight, insurance, and packing unless expressly stated otherwise.` },
  { n: "4.2", body: `Prices are based on prevailing costs of raw material, labor, exchange rates, and transportation. In the event of significant fluctuation before delivery, Seller reserves the right to adjust pricing with prior intimation.` },
  { n: "5", title: "Taxes and Duties" },
  { n: "5.1", body: `All applicable taxes including but not limited to GST, custom duties, octroi, cess, or local levies shall be borne by the Buyer, unless otherwise stated.` },
  { n: "5.2", body: `Any statutory change in taxes after the offer or order acceptance but before billing/delivery shall be to the account of the Buyer.` },
  { n: "6", title: "Payment Terms" },
  { n: "6.1", body: `Timely payment is a fundamental condition of this contract. The payment terms specified in the quotation are binding and must be strictly adhered to without deviation or delay.` },
  { n: "6.2", body: `Payments shall be made without deduction, set-off, or withholding.` },
  { n: "6.3", body: `Delayed payments beyond due dates will attract interest @ 18% per annum, or the maximum permissible rate under law.` },
  { n: "7", title: "Delivery and Risk Transfer" },
  { n: "7.1", body: `Delivery schedules are indicative and begin from the receipt of a clear Purchase Order, advance payment (if applicable), and all required technical/engineering clarifications.` },
  { n: "7.2", body: `Risk shall transfer to the Buyer immediately upon dispatch of the goods from Seller's premises, even if transportation is arranged by Seller.` },
  { n: "7.3", body: `Delivery is subject to Force Majeure conditions (see Section 17).` },
  { n: "8", title: "Packing and Forwarding" },
  { n: "8.1", body: `Goods shall be securely packed using bubble wrap and shrink film as standard. Any special packaging requirements, such as wooden crates or custom protection, shall be provided upon request and will incur additional charges, unless explicitly stated otherwise in the quotation.` },
  { n: "8.2", body: `Seller shall not be responsible for transit damages. Buyer must lodge claims with the transporter/insurer as and if applicable.` },
  { n: "9", title: "Inspection and Testing" },
  { n: "9.1", body: `Factory Acceptance Test (FAT) or Pre-dispatch Inspection (PDI) shall be conducted at Seller's works if included in the scope.` },
  { n: "9.2", body: `If Buyer or their authorized representative fails to attend the FAT despite due notice, the test will be conducted in their absence and shall be considered final and binding.` },
  { n: "10", title: "Installation & Commissioning (if applicable)" },
  { n: "10.1", body: `Installation, commissioning, and on-site services (if included) shall be scheduled in coordination with Buyer, subject to:`,
    bullets: ["Site readiness", "Uninterrupted power supply", "Qualified manpower availability"] },
  { n: "10.2", body: `Charges for such services are extra unless otherwise included in the offer.` },
  { n: "11", title: "Warranty" },
  { n: "11.1", body: `Seller warrants the Goods against manufacturing defects for 12 months from the date of supply or 18 months from the date of dispatch, whichever is earlier.` },
  { n: "11.2", body: `This warranty excludes:`, bullets: [
      "Damage due to mishandling, improper storage, wrong installation, overloading, short circuits",
      "Unauthorized alterations",
      "Consumables and wear-and-tear components",
    ]},
  { n: "11.3", body: `Buyer must notify defects within the warranty period in writing. Seller shall repair or replace (at its discretion) the defective part.` },
  { n: "11.4", body: `After handover, any visit will be on chargeable basis @ Rs. 12,000/- Per man-day. Travelling, lodging, boarding and local conveyance must be arranged by the purchaser.` },
  { n: "11.5", body: `A warranty covers manufacturing defects for hardware involved. It does not cover failure due to wear and tear. Warranty is applicable for normal working condition. Except repairing, all the cost which includes transportation taxes, custom duty etc to be borne by the purchaser.` },
  { n: "12", title: "Intellectual Property" },
  { n: "12.1", body: `All designs, drawings, software, and documentation provided by Seller are its intellectual property and shall not be copied, disclosed, or used for purposes outside the scope of the order.` },
  { n: "12.2", title: "Software Ownership and Licensing",
    body: `Unless explicitly stated otherwise in the offer, the software provided may be either SCADA-based or WinForms-based. Both versions are the exclusive intellectual property of the Seller and may not be copied, distributed, lent, or transferred in any form without the Seller's prior written consent. For the purposes of this agreement, a "lifetime license" or "perpetual license" shall be defined as a license valid for a period of ten (10) years from the date of sale.` },
  { n: "12.3", body: `Buyer shall not reverse-engineer or replicate Seller's designs or systems.` },
  { n: "13", title: "Confidentiality",
    body: `Both parties agree to maintain confidentiality of commercial and technical information exchanged during the contract and not to disclose it to third parties without written consent.` },
  { n: "14", title: "Cancellation & Termination" },
  { n: "14.1", body: `Orders once placed are not cancellable without Seller's written consent.` },
  { n: "14.2", body: `In the event of cancellation, Buyer shall be liable for:`,
    bullets: ["Work completed", "Raw material committed", "Cancellation charges as determined by Seller"] },
  { n: "15", title: "Return & Replacement" },
  { n: "15.1", body: `No goods shall be returned without prior written approval.` },
  { n: "15.2", body: `If goods are returned due to Buyer's error or change of plan, handling/restocking charges will apply.` },
  { n: "16", title: "Storage and Security Charges" },
  { n: "16.1", body: `In the event that dispatch is delayed beyond 20 (twenty) days from the date the Buyer is informed that the goods are ready for dispatch at the Seller's factory, due to reasons attributable to the Buyer, storage and security charges shall apply at the rate of 0.05% of the total order value per day of delay, calculated on a pro-rata basis. These charges are intended to cover warehousing, handling, insurance, and associated risks incurred during the extended storage period.` },
  { n: "16.2", body: `For the avoidance of doubt, this provision shall not be construed as the Seller accepting any liability or responsibility for the safety, condition, or custody of the goods after the expiry of the 20-day period. From the 21st day onward, the goods shall be deemed to be held at the Buyer's risk, and the Seller shall not be liable for any loss, damage, deterioration, or theft during the storage period.` },
  { n: "17", title: "Force Majeure",
    body: `Seller shall not be held liable for failure or delay in performance due to reasons beyond its reasonable control, including but not limited to:`,
    bullets: ["Natural disasters, Epidemics/pandemics, War/Terrorism", "Supplier delays", "Government actions or embargoes"] },
  { n: "17.1", body: `In such cases, Seller may extend delivery or cancel part/all of the order without penalty.` },
  { n: "18", title: "Limitation of Liability",
    body: `Seller's liability under any circumstances shall be limited to the value of the goods supplied under the specific purchase order. Seller shall not be liable for any indirect, special, incidental, or consequential damages, including loss of profits, downtime, or reputation.` },
  { n: "19", title: "Governing Law and Jurisdiction",
    body: `This contract shall be governed by and construed in accordance with the laws of India. All disputes, controversies, or claims arising out of or in relation to this contract shall be subject to the exclusive jurisdiction of courts in Thane, Maharashtra.` },
  { n: "20", title: "Entire Agreement",
    body: `These Terms and Conditions, along with the relevant quotation and mutually agreed special terms (if any), constitute the entire agreement between the parties. Other terms, conditions, or representations, whether oral or written, shall not be binding unless confirmed in writing by the Seller.` },
  { n: "21", title: "Severability",
    body: `If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.` },
  { n: "22", title: "Amendment",
    body: `These Terms and Conditions may be amended or modified only by a written agreement duly signed by authorized representatives of both Buyer and Seller.` },
];

export function weightClause(c: TermsClause): number {
  let w = 4; // gap
  if (c.title) w += 7 + Math.ceil(c.title.length / 80) * 6;
  if (c.body) w += Math.ceil(c.body.length / 95) * 5 + 3;
  if (c.bullets) w += c.bullets.reduce((acc, b) => acc + Math.ceil(b.length / 90) * 5 + 2, 4);
  return Math.max(w, 12);
}
