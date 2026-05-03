import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <Skeleton className="h-1 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
