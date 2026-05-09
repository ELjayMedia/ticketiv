import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { EventDetailArtist } from "@/lib/data/public/event-detail"

interface EventLineupProps {
  artists: EventDetailArtist[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function EventLineup({ artists }: EventLineupProps) {
  if (artists.length === 0) return null

  return (
    <section aria-labelledby="lineup-heading">
      <h2 id="lineup-heading" className="mb-3 font-display text-xl font-bold">
        Lineup
      </h2>
      {/* Horizontal scroll carousel */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
        role="list"
        aria-label="Artist lineup"
      >
        {artists.map((artist) => (
          <div key={artist.id} role="listitem" className="shrink-0">
            {artist.slug ? (
              <Link
                href={`/artists/${artist.slug}`}
                className="group flex w-20 flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
              >
                <Avatar className="size-16 ring-2 ring-border transition-colors group-hover:ring-primary">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(artist.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="w-full text-center text-xs font-medium leading-tight text-foreground line-clamp-2">
                  {artist.name}
                </span>
                {artist.role && (
                  <span className="text-center text-xs text-muted-foreground leading-tight capitalize">
                    {artist.role}
                  </span>
                )}
              </Link>
            ) : (
              <div className="flex w-20 flex-col items-center gap-2 p-1">
                <Avatar className="size-16 ring-2 ring-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(artist.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="w-full text-center text-xs font-medium leading-tight text-foreground line-clamp-2">
                  {artist.name}
                </span>
                {artist.role && (
                  <span className="text-center text-xs text-muted-foreground leading-tight capitalize">
                    {artist.role}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
