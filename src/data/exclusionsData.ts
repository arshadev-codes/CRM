export interface ExclusionItem { id: string; title: string; defaultIncluded?: boolean; }
export const exclusionsData: ExclusionItem[] = [
  { id: "interconn-cables", title: "All interconnection cables outside scope battery limit", defaultIncluded: true },
  { id: "civil", title: "Civil works of any nature", defaultIncluded: true },
  { id: "foundation", title: "Foundation work for equipment", defaultIncluded: true },
  { id: "fence", title: "Fence and gates", defaultIncluded: true },
  { id: "ventilation", title: "Ventilation and air-conditioning systems", defaultIncluded: true },
  { id: "lighting", title: "Lighting system in test bay", defaultIncluded: true },
  { id: "field-jb", title: "Field junction boxes outside panels", defaultIncluded: true },
  { id: "panel-ac", title: "Panel air-conditioning", defaultIncluded: false },
  { id: "receipt", title: "Receipt and unloading at site", defaultIncluded: true },
  { id: "storage", title: "Storage at site", defaultIncluded: true },
  { id: "cable-laying", title: "Power cable laying", defaultIncluded: true },
  { id: "earthpit", title: "Earth pit construction", defaultIncluded: true },
  { id: "insurance", title: "Insurance at site", defaultIncluded: true },
  { id: "statutory", title: "Statutory approvals and clearances", defaultIncluded: true },
];
