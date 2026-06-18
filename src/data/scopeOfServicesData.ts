export interface ServiceItem { id: string; title: string; description?: string; defaultIncluded?: boolean; }
export const scopeOfServicesData: ServiceItem[] = [
  { id: "engineering", title: "Detailed engineering and design", defaultIncluded: true },
  { id: "supervision", title: "Supervision of installation at site", defaultIncluded: true },
  { id: "commissioning", title: "Testing and commissioning", defaultIncluded: true },
  { id: "training-class", title: "Classroom training (5 days)", defaultIncluded: true },
  { id: "training-site", title: "On-site hands-on training (3 days)", defaultIncluded: true },
  { id: "warranty", title: "12 months warranty from commissioning", defaultIncluded: true },
  { id: "calibration", title: "Initial instrument calibration", defaultIncluded: true },
];
