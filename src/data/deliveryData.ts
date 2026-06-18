export interface DeliveryRow { id: string; deliverable: string; duration: string; custom?: string; }
export const deliveryDurationOptions = [
  "1-2 Weeks","3-4 Weeks","5-6 Weeks","7-8 Weeks","9-10 Weeks","11-12 Weeks",
  "13-14 Weeks","15-16 Weeks","17-18 Weeks","19-20 Weeks","Will Be Decided Later","Custom",
];
export const deliveryDefaults: DeliveryRow[] = [
  { id: "docs", deliverable: "Deliverable Documents", duration: "3-4 Weeks" },
  { id: "supply", deliverable: "Supply Of Material", duration: "17-18 Weeks" },
  { id: "packing", deliverable: "Packing Forwarding & Transit", duration: "19-20 Weeks" },
  { id: "erection", deliverable: "Erection", duration: "Will Be Decided Later" },
  { id: "supervision", deliverable: "Supervision Of Installation", duration: "Will Be Decided Later" },
  { id: "commissioning", deliverable: "Commissioning", duration: "Will Be Decided Later" },
  { id: "training", deliverable: "Training", duration: "Will Be Decided Later" },
];
