export type ConnectionGroup = "A" | "B" | "C" | "Other";

export const testToConnection: Record<string, ConnectionGroup> = {
  "no-load":            "A",
  "harmonic":           "A",
  "ivw":                "A",
  "ivpd":               "A",

  "short-circuit":      "B",
  "temp-rise":          "B",

  "winding-resistance": "C",
  "voltage-ratio":      "C",
  "vector-group":       "C",
  "ir-pi":              "C",
  "mag-balance":        "C",
  "av":                 "C",

  // 415v-method is handled specially in ConnectionsTestsPdf —
  // it injects two synthetic entries into Connection B instead of
  // appearing as its own row. Mapped to "Other" here so the normal
  // loop skips it; the component adds the two implied tests manually.
  "415v-method":        "Other",

  "oltc":               "Other",
  "core-frame":         "Other",
  "leak":               "Other",
  "li":                 "Other",
  "zero-seq":           "Other",
};

export const connectionLabels: Record<ConnectionGroup, string> = {
  A: "Connection A",
  B: "Connection B",
  C: "Connection C",
  Other: "Additional Tests",
};

// The two tests implied by "415v-method" when it is selected.
// Injected into Connection B automatically.
export const METHOD_415V_IMPLIED_B: { id: string; title: string }[] = [
  { id: "415v-no-load-current",    title: "Measurement of No-load Current" },
  { id: "415v-impedance-voltage",  title: "Measurement of Impedance Voltage" },
];