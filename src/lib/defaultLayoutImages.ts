// Default schematic layout images per system type, encoded as SVG data URIs
// so no external asset files are required. Users can override with their own
// image via the wizard's "Change Image" action.
import type { SystemType } from "@/data/systemTypesData";

function svg(label: string, subtitle: string, accent: string): string {
  const s = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <!-- Grid -->
  <g stroke="#cbd5e1" stroke-width="1" opacity="0.5">
    ${Array.from({length: 24}).map((_,i)=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="800"/>`).join("")}
    ${Array.from({length: 16}).map((_,i)=>`<line x1="0" y1="${i*50}" x2="1200" y2="${i*50}"/>`).join("")}
  </g>
  <!-- Transformer -->
  <rect x="500" y="320" width="200" height="160" rx="12" fill="white" stroke="${accent}" stroke-width="4"/>
  <text x="600" y="410" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${accent}">TRANSFORMER</text>
  <!-- MG Set -->
  <rect x="120" y="340" width="180" height="120" rx="10" fill="white" stroke="#0f766e" stroke-width="3"/>
  <text x="210" y="405" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#0f766e">MG SET</text>
  <!-- Control Room -->
  <rect x="900" y="320" width="180" height="160" rx="10" fill="white" stroke="#7c3aed" stroke-width="3"/>
  <text x="990" y="395" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#7c3aed">CONTROL</text>
  <text x="990" y="418" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#7c3aed">PANEL</text>
  <!-- HV Test Bay -->
  <rect x="500" y="120" width="200" height="120" rx="10" fill="white" stroke="#dc2626" stroke-width="3"/>
  <text x="600" y="190" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#dc2626">HV TEST BAY</text>
  <!-- Capacitor Bank -->
  <rect x="500" y="560" width="200" height="120" rx="10" fill="white" stroke="#059669" stroke-width="3"/>
  <text x="600" y="628" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#059669">CAPACITOR BANK</text>
  <!-- Connections -->
  <g stroke="#334155" stroke-width="3" fill="none">
    <line x1="300" y1="400" x2="500" y2="400"/>
    <line x1="700" y1="400" x2="900" y2="400"/>
    <line x1="600" y1="240" x2="600" y2="320"/>
    <line x1="600" y1="480" x2="600" y2="560"/>
  </g>
  <!-- Label -->
  <rect x="40" y="40" width="440" height="90" rx="10" fill="${accent}"/>
  <text x="60" y="82" font-family="Arial" font-size="28" font-weight="800" fill="white">${label}</text>
  <text x="60" y="110" font-family="Arial" font-size="16" fill="white" opacity="0.85">${subtitle}</text>
  <text x="1160" y="780" text-anchor="end" font-family="Arial" font-size="12" fill="#64748b" font-style="italic">Default schematic — replace with actual layout drawing</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

export const defaultLayoutImages: Record<SystemType, string> = {
  Advanced: svg("Advanced System Layout", "Fully automated with digital twin & PD measurement", "#1d4ed8"),
  FullyAutomatic: svg("Fully Automatic System Layout", "Automated test sequencing with software", "#7c3aed"),
  SemiAutomatic: svg("Semi Automatic System Layout", "Software for reporting; manual LV trolley", "#0f766e"),
  Conventional: svg("Conventional System Layout", "Fully manual operation, entry-level configuration", "#b45309"),
};
