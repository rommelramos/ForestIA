import { cn } from "@/lib/utils"

/**
 * Pulse-animation placeholder used while content is loading.
 * Drop it anywhere that normally renders real content:
 *
 *   <Skeleton className="h-4 w-32 rounded" />
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-700/50", className)}
      {...props}
    />
  )
}

export { Skeleton }
