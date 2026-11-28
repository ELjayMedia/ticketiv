import { FollowButton } from "@/components/follows/follow-button"
import { Card, CardBody } from "@/components/quiet/ui/card"

/** "Hear about their next event" prompt on the order confirmation (TICK-434). */
export function PostPurchaseFollow({
  orgId,
  orgName,
  following,
  followerCount,
  returnTo,
}: {
  orgId: string
  orgName: string
  following: boolean
  followerCount: number
  returnTo: string
}) {
  return (
    <div className="mx-auto max-w-[480px] px-4 pb-6">
      <Card>
        <CardBody className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">
              {following ? `You follow ${orgName}` : `Hear about ${orgName}'s next event`}
            </span>
            <span className="text-[12px] text-ink-3">
              Followers get an in-app alert when they announce something new. You can unfollow any time.
            </span>
          </div>
          <FollowButton
            kind="organizer"
            id={orgId}
            name={orgName}
            initialFollowing={following}
            initialCount={followerCount}
            signedIn
            returnTo={returnTo}
          />
        </CardBody>
      </Card>
    </div>
  )
}
