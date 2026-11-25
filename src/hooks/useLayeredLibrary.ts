import { useProposalStore } from "@/store/proposalStore";
import { applyLibraryOverride, type LibraryOverride } from "@/data/libraries";
import { clearSharedItem, removeSharedItem, saveSharedItem, sharedKey } from "@/lib/sharedSettings";

/** Where an item's current text comes from. */
export type ItemScope =
  /** As shipped with the app. */
  | "builtin"
  /** Saved globally: every user sees it. */
  | "global"
  /** Saved locally: this browser only (a new item, or this browser's edit of another one). */
  | "local";

const EMPTY = { items: [], deleted: [] };

/**
 * One Settings list in three layers: the built-in items, the global changes
 * (database, every user) and this browser's own ("local") changes.
 * `key` is the cmsOverrides key, e.g. "library:tests" or "subsystems:Advanced".
 */
export function useLayeredLibrary<T extends { id: string }>(key: string, base: T[]) {
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  const setCms = useProposalStore(s => s.setCms);
  const loadSharedSettings = useProposalStore(s => s.loadSharedSettings);

  const shared = (cmsOverrides[sharedKey(key)] as LibraryOverride<T> | undefined) ?? (EMPTY as LibraryOverride<T>);
  const local = (cmsOverrides[key] as LibraryOverride<T> | undefined) ?? (EMPTY as LibraryOverride<T>);

  const sharedBase = applyLibraryOverride(base, shared);
  const items = applyLibraryOverride(sharedBase, local);

  const builtInIds = new Set(base.map(b => b.id));
  const sharedBaseIds = new Set(sharedBase.map(b => b.id));
  const sharedIds = new Set(shared.items.map(i => i.id));
  const localIds = new Set(local.items.map(i => i.id));

  const scopeOf = (id: string): ItemScope => (localIds.has(id) ? "local" : sharedIds.has(id) ? "global" : "builtin");
  /** True when the item also exists without this browser's changes (built-in or global). */
  const existsBeyondLocal = (id: string) => sharedBaseIds.has(id);

  const setLocal = (next: LibraryOverride<T>) => setCms(key, next);
  const withoutLocal = (id: string): LibraryOverride<T> => ({
    items: local.items.filter(i => i.id !== id),
    deleted: local.deleted.filter(d => d !== id),
  });

  /** Save for this browser only. */
  const saveLocal = (item: T) => {
    const exists = local.items.some(i => i.id === item.id);
    setLocal({
      items: exists ? local.items.map(i => (i.id === item.id ? item : i)) : [...local.items, item],
      deleted: sharedBaseIds.has(item.id) ? Array.from(new Set([...local.deleted, item.id])) : local.deleted,
    });
  };

  /** Save for every user. This browser's own copy is dropped so the global one shows. */
  const saveGlobal = async (item: T): Promise<boolean> => {
    if (!(await saveSharedItem(key, item))) return false;
    setLocal(withoutLocal(item.id));
    await loadSharedSettings();
    return true;
  };

  /** Remove in this browser only. */
  const removeLocal = (id: string) =>
    setLocal({
      items: local.items.filter(i => i.id !== id),
      deleted: sharedBaseIds.has(id) ? Array.from(new Set([...local.deleted, id])) : local.deleted,
    });

  /** Remove for every user. */
  const removeGlobal = async (id: string): Promise<boolean> => {
    if (!(await removeSharedItem(key, id, builtInIds.has(id)))) return false;
    setLocal(withoutLocal(id));
    await loadSharedSettings();
    return true;
  };

  /** Hidden in this browser only (restore brings them back here). */
  const locallyRemoved = sharedBase.filter(b => local.deleted.includes(b.id) && !localIds.has(b.id));
  const restoreLocal = (id: string) => setLocal({ ...local, deleted: local.deleted.filter(d => d !== id) });

  /** Built-in items removed for every user. */
  const globallyRemoved = base.filter(b => shared.deleted.includes(b.id) && !sharedIds.has(b.id));
  const restoreGlobal = async (id: string): Promise<boolean> => {
    if (!(await clearSharedItem(key, id))) return false;
    await loadSharedSettings();
    return true;
  };

  const hasLocalChanges = local.items.length + local.deleted.length > 0;
  const resetLocal = () => setLocal({ items: [], deleted: [] });

  return {
    items, scopeOf, existsBeyondLocal,
    saveLocal, saveGlobal, removeLocal, removeGlobal,
    locallyRemoved, restoreLocal, globallyRemoved, restoreGlobal,
    hasLocalChanges, resetLocal,
    reload: loadSharedSettings,
  };
}

export type LayeredLibrary<T extends { id: string }> = ReturnType<typeof useLayeredLibrary<T>>;
