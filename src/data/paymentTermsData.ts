export interface PaymentMilestone { id: string; label: string; percent: number; }
export interface PaymentTemplate { id: string; name: string; milestones: PaymentMilestone[]; }
export const paymentTemplatesData: PaymentTemplate[] = [
  { id: "20-10-60-10", name: "20-10-60-10",
    milestones: [
      { id: "advance", label: "Advance against PO", percent: 20 },
      { id: "drawing", label: "On drawing approval", percent: 10 },
      { id: "dispatch", label: "Pro-rata against dispatch", percent: 60 },
      { id: "commissioning", label: "On commissioning", percent: 10 },
    ] },
  { id: "30-20-40-10", name: "30-20-40-10",
    milestones: [
      { id: "advance", label: "Advance against PO", percent: 30 },
      { id: "drawing", label: "On drawing approval", percent: 20 },
      { id: "dispatch", label: "Pro-rata against dispatch", percent: 40 },
      { id: "commissioning", label: "On commissioning", percent: 10 },
    ] },
];
