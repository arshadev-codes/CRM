// Resolves the effective test→connection mapping using CMS overrides on top of
// the static testToConnection map. Overrides are stored as a plain Record under
// the cmsOverrides key `connections:mapping`.
import { testToConnection, connectionLabels, type ConnectionGroup } from "./connectionsData";
import { useProposalStore } from "@/store/proposalStore";

export const CMS_CONNECTIONS_KEY = "connections:mapping";

export type ConnectionsMap = Record<string, ConnectionGroup>;

/** Built-in mapping, then the global changes (every user), then this browser's own. */
export function resolveConnectionsMap(override?: unknown, shared?: unknown): ConnectionsMap {
  const base: ConnectionsMap = { ...testToConnection };
  for (const layer of [shared, override]) {
    if (!layer || typeof layer !== "object") continue;
    for (const [k, v] of Object.entries(layer as Record<string, string>)) {
      if (v === "A" || v === "B" || v === "C" || v === "Other") base[k] = v;
      else if (v === "__unset__") delete base[k];
    }
  }
  return base;
}

export function useConnectionsMap(): ConnectionsMap {
  const ov = useProposalStore(s => s.cmsOverrides[CMS_CONNECTIONS_KEY]);
  const shared = useProposalStore(s => s.cmsOverrides[`shared:${CMS_CONNECTIONS_KEY}`]);
  return resolveConnectionsMap(ov, shared);
}

export { connectionLabels };
export type { ConnectionGroup };
