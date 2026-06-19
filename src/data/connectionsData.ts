// Maps each test id (matching testsData.ts) to its connection group A/B/C.
// Tests not in this map are silently grouped under "Other".
export type ConnectionGroup = "A" | "B" | "C" | "Other";

export const testToConnection: Record<string, ConnectionGroup> = {
  "no-load": "A",          // Measurement of No-load Loss / Current
  "harmonic": "A",
  "ivw": "A",              // Induced Overvoltage Withstand Test
  "ivpd": "A",

  "short-circuit": "B",    // Impedance + Load Loss
  "temp-rise": "B",

  "winding-resistance": "C",
  "voltage-ratio": "C",
  "vector-group": "C",
  "ir-pi": "C",
  "mag-balance": "C",
  "av": "C",               // Applied Voltage Test
  "415v-method": "C",
  "oltc": "Other",
  "core-frame": "Other",
  "leak": "Other",
  "li": "Other",
  "zero-seq": "Other",
};

export const connectionLabels: Record<ConnectionGroup, string> = {
  A: "Connection A",
  B: "Connection B",
  C: "Connection C",
  Other: "Additional Tests",
};
