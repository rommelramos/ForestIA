import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown by Next.js while the dashboard page (server component) is streaming.
 * Matches the visual structure of the real page so there is no layout shift.
 */
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-start justify-between gap-4 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Modules grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>

    </div>
  )
}
