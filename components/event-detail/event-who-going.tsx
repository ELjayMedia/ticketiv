import { Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { EventDetailData } from "@/lib/data/public/event-detail"

interface EventWhoGoingProps {
  buyerCount: number
  friendsGoing: EventDetailData["friends_going"]
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function EventWhoGoing({ buyerCount, friendsGoing }: EventWhoGoingProps) {
  const hasFriends = friendsGoing.length > 0
  const displayCount = buyerCount > 0 ? buyerCount : null

  if (!displayCount && !hasFriends) return null

  return (
    <section aria-labelledby="who-going-heading">
      <h2 id="who-going-heading" className="mb-3 font-display text-xl font-bold">
        Who&apos;s going
      </h2>
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"
            aria-hidden="true"
          >
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground">
            {displayCount ? (
              <span>
                <strong>{displayCount.toLocaleString()}</strong>{" "}
                {displayCount === 1 ? "person" : "people"} going
              </span>
            ) : (
              <span>Be the first to go!</span>
            )}
          </p>
        </div>

        {hasFriends && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2" role="list" aria-label="Friends going">
              {friendsGoing.slice(0, 5).map((friend) => (
                <Avatar
                  key={friend.user_id}
                  className="size-8 ring-2 ring-background"
                  role="listitem"
                  aria-label={friend.display_name ?? "Friend"}
                >
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {getInitials(friend.display_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {friendsGoing.length === 1
                ? `${friendsGoing[0].display_name ?? "A friend"} is going`
                : `${friendsGoing.length} friends going`}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
