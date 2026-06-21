import { Skeleton } from "@/components/quiet/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />
      <div className="px-5 pb-4 pt-2">
        <Skeleton className="mb-5 h-9 w-9 rounded-full" />
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-8 w-32 mb-1.5" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="flex flex-col gap-2 px-5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3.5"
          >
            <Skeleton className="h-[68px] w-[68px] rounded-[var(--radius-md)]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
