import Link from "next/link"
import { Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EventDetailData } from "@/lib/data/public/event-detail"

interface EventOrganizerProps {
  organization: EventDetailData["organization"]
}

export function EventOrganizer({ organization }: EventOrganizerProps) {
  if (!organization) return null

  return (
    <section aria-labelledby="organizer-heading">
      <h2 id="organizer-heading" className="mb-3 font-display text-xl font-bold">
        Organizer
      </h2>
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden"
            aria-hidden="true"
          >
            {organization.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{organization.name}</p>
            {organization.bio && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {organization.bio}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="mt-3 w-full"
        >
          <Link
            href={`/organisers/${organization.slug}`}
            aria-label={`View ${organization.name} on Ticketiv`}
          >
            View organizer
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
