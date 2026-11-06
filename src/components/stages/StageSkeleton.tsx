import { Skeleton } from "@/components/ui/skeleton";

// Placeholder rows shaped like the list sections on the stage pages.
export function ListSkeleton({ sections = 1, rows = 4 }: { sections?: number; rows?: number }) {
  return (
    <div
      className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full"
      role="status"
      aria-label="Loading"
    >
      <div className="neo-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        ))}
        <Skeleton className="h-2 w-28 rounded-full" />
      </div>
      {Array.from({ length: sections }, (_, s) => (
        <div key={s}>
          <div className="mb-3 flex items-end justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          <div className="neo-surface divide-y divide-border/40 overflow-hidden rounded-2xl">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${55 - r * 7}%` }} />
                <Skeleton className="h-6 w-6 rounded-full max-sm:hidden" />
                <Skeleton className="h-3 w-16 max-sm:hidden" />
                <Skeleton className="h-3 w-16 max-sm:hidden" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Whole stage page while the order itself is still loading.
export function StagePageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8" role="status" aria-label="Loading">
      <div className="mx-auto mb-6 flex w-full max-w-[80vw] flex-wrap items-center gap-4 max-lg:max-w-full">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-7 w-44" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-14 w-56 rounded-2xl" />
        <Skeleton className="h-[76px] w-40 rounded-2xl" />
      </div>
      <ListSkeleton sections={2} rows={3} />
    </div>
  );
}

// Generic page placeholder: title bar plus a grid of tiles.
export function PageSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6" role="status" aria-label="Loading">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} className="neo-surface space-y-3 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
