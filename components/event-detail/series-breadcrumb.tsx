import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { EventDetailSeries } from "@/lib/data/public/event-detail"

interface SeriesBreadcrumbProps {
  series: EventDetailSeries
}

export function SeriesBreadcrumb({ series }: SeriesBreadcrumbProps) {
  return (
    <Link
      href={`/series/${series.slug}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <span>Part of {series.title}</span>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  )
}
