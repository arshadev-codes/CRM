import { createContext, useContext, type ReactNode } from "react";

// Whether the signed-in user may change the stage page they are on. Set once by
// the stage route so nested panels (sessions, PDI, trackers) can read it.
const StageEditContext = createContext(true);

export function StageAccessProvider({ canEdit, children }: { canEdit: boolean; children: ReactNode }) {
  return <StageEditContext.Provider value={canEdit}>{children}</StageEditContext.Provider>;
}

export function useStageCanEdit(): boolean {
  return useContext(StageEditContext);
}

/** Renders its children only when the user may edit this stage. */
export function EditOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useStageCanEdit() ? <>{children}</> : <>{fallback}</>;
}

/**
 * Keeps a block of inline-editable fields readable but locked for view-only users.
 * Uses a disabled fieldset, which disables every input, select and button inside.
 */
export function EditLock({ children }: { children: ReactNode }) {
  const canEdit = useStageCanEdit();
  return (
    <fieldset disabled={!canEdit} className="contents">
      {children}
    </fieldset>
  );
}
