// Resolves the effective test→connection mapping using CMS overrides on top of
// the static testToConnection map. Overrides are stored as a plain Record under
// the cmsOverrides key `connections:mapping`.
import { testToConnection, connectionLabels, type ConnectionGroup } from "./connectionsData";
import { useProposalStore } from "@/store/proposalStore";

export const CMS_CONNECTIONS_KEY = "connections:mapping";

export type ConnectionsMap = Record<string, ConnectionGroup>;

export function resolveConnectionsMap(override?: unknown): ConnectionsMap {
  const base: ConnectionsMap = { ...testToConnection };
  if (override && typeof override === "object") {
    for (const [k, v] of Object.entries(override as Record<string, string>)) {
      if (v === "A" || v === "B" || v === "C" || v === "Other") base[k] = v;
      else if (v === "__unset__") delete base[k];
    }
  }
  return base;
}

export function useConnectionsMap(): ConnectionsMap {
  const ov = useProposalStore(s => s.cmsOverrides[CMS_CONNECTIONS_KEY]);
  return resolveConnectionsMap(ov);
}

export { connectionLabels };
export type { ConnectionGroup };
