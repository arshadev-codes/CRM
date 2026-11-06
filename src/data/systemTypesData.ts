export type SystemType = "Advanced" | "FullyAutomatic" | "SemiAutomatic" | "Conventional";
export interface SystemTypeMeta {
  id: SystemType;
  label: string;
  tagline: string;
  description: string;
  badge: string;
}
export const systemTypesData: SystemTypeMeta[] = [
  { id: "Advanced", label: "Advanced", badge: "Flagship", tagline: "Fully automated with full reporting suite",
    description: "Complete automation, software-driven reporting, automatic LV trolley, advanced PD measurement and digital twin." },
  { id: "FullyAutomatic", label: "Fully Automatic", badge: "Premium", tagline: "Automated testing with full software",
    description: "Automated test sequencing with software and automatic LV trolley. Ideal for high-volume routine testing." },
  { id: "SemiAutomatic", label: "Semi Automatic", badge: "Standard", tagline: "Manual trolley, report generation only",
    description: "Software for report generation only. Manual LV trolley operation. Cost-effective mid-range option." },
  { id: "Conventional", label: "Conventional", badge: "Economy", tagline: "Manual operation, no software",
    description: "Fully manual operation without software. Economical entry-level test system for basic requirements." },
];
