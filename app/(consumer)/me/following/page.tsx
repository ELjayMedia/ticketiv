import Link from "next/link"
import { redirect } from "next/navigation"

import { FollowButton } from "@/components/follows/follow-button"
import { SeriesFollowButton } from "@/components/series/series-follow-button"
import { Avatar } from "@/components/quiet/ui/primitives"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { getMyFollows } from "@/lib/data/attendee/follows"
import { groupFollows } from "@/lib/follows/my-follows"

export const metadata = { title: "Following" }
export const dynamic = "force-dynamic"

/** `/me/following` — organisers, series, artists and venues you follow (TICK-452). */
export default async function FollowingPage() {
  const follows = await getMyFollows()
  if (follows === null) redirect("/login?next=/me/following")
  const groups = groupFollows(follows)

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <Link href="/me" className="text-[13px] font-semibold text-accent hover:underline">
          ← You
        </Link>
        <h1 className="text-h1">Following</h1>
        <p className="text-[13px] text-ink-3">
          You get one in-app alert when any of these publishes a new event, even if you follow several of them.
          Turn alerts off in <Link href="/account/settings?tab=notifications" className="text-accent hover:underline">notification settings</Link>.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card flat className="border-dashed">
          <CardBody className="flex flex-col gap-2 p-6 text-center">
            <h2 className="text-h2">You aren&apos;t following anyone yet</h2>
            <p className="text-[13px] text-ink-3">
              Follow an organiser, artist, venue or series from its page to hear about their next event.
            </p>
            <Link href="/" className="text-[13px] font-semibold text-accent hover:underline">
              Find events
            </Link>
          </CardBody>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.kind} className="flex flex-col gap-2" aria-labelledby={`following-${group.kind}`}>
            <h2 id={`following-${group.kind}`} className="text-label">
              {group.label} · {group.items.length}
            </h2>
            <Card>
              <ul className="divide-y divide-line">
                {group.items.map((item) => (
                  <li key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={item.href} className="flex min-w-0 items-center gap-3 hover:underline">
                      <Avatar src={item.imageUrl ?? undefined} label={item.name.slice(0, 2).toUpperCase()} size={36} />
                      <span className="truncate text-[14px] font-semibold text-ink">{item.name}</span>
                    </Link>
                    {item.kind === "series" && item.slug ? (
                      <SeriesFollowButton seriesId={item.id} seriesSlug={item.slug} initialFollowing signedIn />
                    ) : item.kind === "series" ? null : (
                      <FollowButton
                        kind={item.kind}
                        id={item.id}
                        name={item.name}
                        initialFollowing
                        initialCount={0}
                        signedIn
                        returnTo="/me/following"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  )
}
