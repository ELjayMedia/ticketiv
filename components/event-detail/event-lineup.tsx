import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

function ArtistCard({ artist }: { artist: EventDetailArtist }) {
  return (
    <div className="flex w-20 flex-col items-center gap-2 p-1">
      <Avatar className="size-16 ring-2 ring-border transition-colors group-hover:ring-primary">
        {artist.image_url && (
          <AvatarImage src={artist.image_url} alt={artist.name} />
        )}
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
  )
}

export function EventLineup({ artists }: EventLineupProps) {
  if (artists.length === 0) return null

  return (
    <section aria-labelledby="lineup-heading">
      <h2 id="lineup-heading" className="mb-3 font-display text-xl font-bold">
        Lineup
      </h2>
      <div
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
        role="list"
        aria-label="Artist lineup"
      >
        {artists.map((artist) => (
          <div key={artist.id} role="listitem" className="shrink-0">
            {artist.slug ? (
              <Link
                href={`/artists/${artist.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <ArtistCard artist={artist} />
              </Link>
            ) : (
              <ArtistCard artist={artist} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
