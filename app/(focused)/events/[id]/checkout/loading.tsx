import { Skeleton } from "@/components/quiet/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="flex h-dvh flex-col bg-bg md:hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="h-14" />
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pb-3 pt-2">
          <Skeleton circle size={36} />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        {/* Progress */}
        <div className="px-5 pb-3">
          <Skeleton className="h-5 w-full" />
        </div>
        {/* Event ribbon */}
        <div className="mx-5 mb-4">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        {/* Ticket types */}
        <div className="px-5 pb-4">
          <Skeleton className="mb-2 h-3 w-20" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>
        {/* Quantity */}
        <div className="px-5 pb-4">
          <Skeleton className="h-12 w-full rounded-[var(--radius-lg)]" />
        </div>
        {/* Summary */}
        <div className="px-5 pb-4">
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
      {/* Sticky pay */}
      <div className="border-t border-line px-5 py-3.5 pb-7">
        <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
