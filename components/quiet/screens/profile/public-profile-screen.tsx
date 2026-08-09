import Link from "next/link"

import { ShareButton } from "@/components/quiet/screens/profile/profile-actions"
import { Avatar } from "@/components/quiet/ui/primitives"
import type { PublicProfile } from "@/lib/data/attendee/public-profile"

const JOINED_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
})

export function PublicProfileScreen({ profile }: { profile: PublicProfile }) {
  const joined = profile.joinedAt ? new Date(profile.joinedAt) : null
  const initials = profile.displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")

  return (
    <div className="mx-auto min-h-[60dvh] max-w-[480px] bg-bg px-5 pb-24 pt-20">
      <header className="flex justify-end gap-2">
        {profile.isOwner ? (
          <Link
            href="/account/settings"
            className="inline-flex h-9 items-center justify-center rounded-full border border-line-2 px-4 text-[13px] font-semibold text-ink hover:bg-surface"
          >
            Edit profile
          </Link>
        ) : null}
        <ShareButton
          handle={profile.handle}
          name={profile.displayName}
          label="Share profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface"
        />
      </header>

      <section className="flex flex-col items-center gap-3 pt-5 text-center">
        <Avatar
          src={profile.avatarUrl ?? ""}
          label={initials || profile.handle.slice(0, 2).toUpperCase()}
          size={96}
        />
        <div>
          <h1 className="text-h2 text-[22px]">{profile.displayName}</h1>
          <p className="mt-1 font-mono text-[11px] text-ink-3">
            @{profile.handle}
            {joined ? ` · joined ${JOINED_FMT.format(joined)}` : ""}
          </p>
        </div>
        <p className="max-w-[320px] text-[13px] leading-relaxed text-ink-3">
          Discover and book events together on Ticketiv.
        </p>
      </section>
    </div>
  )
}
