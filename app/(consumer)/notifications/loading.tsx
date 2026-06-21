import { Skeleton } from "@/components/quiet/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-[480px]">
      <div className="sticky top-0 z-10 bg-bg px-5 pb-3 pt-14">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-col divide-y divide-line px-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 py-4">
            <Skeleton circle size={36} />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
