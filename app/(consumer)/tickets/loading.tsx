import { Skeleton, SkeletonCard } from "@/components/quiet/ui/skeleton";

export default function TicketsLoading() {
  return (
    <div className="mx-auto max-w-[480px]">
      {/* Segmented tab row */}
      <div className="sticky top-0 z-10 bg-bg px-4 pb-3 pt-16">
        <Skeleton className="h-9 w-full rounded-[var(--radius-md)]" />
      </div>

      {/* Featured ticket card */}
      <div className="px-4">
        <SkeletonCard className="mb-4" />
      </div>

      {/* Ticket list rows */}
      <div className="flex flex-col gap-2 px-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3.5"
          >
            <Skeleton className="h-[60px] w-[60px] rounded-[var(--radius-md)]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
