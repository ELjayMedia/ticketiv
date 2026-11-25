import Link from "next/link"

import { addExclusionAction, removeExclusionAction, setFlagAction } from "@/app/super-admin/feature-flags/actions"
import { FeatureFlagCard, type FlagInfo } from "@/components/super-admin/FeatureFlagCards"
import { getFeatureFlagBoard } from "@/lib/data/admin/feature-flags"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Feature flags · Admin" }
export const dynamic = "force-dynamic"

/** What each flag controls in the app. Flags missing here show as "not checked yet". */
const FLAG_INFO: Record<string, FlagInfo> = {
  pos_enabled: { label: "Box office (POS)", appliesTo: "the box-office sales screen organisers use at the door" },
  resale_enabled: { label: "Ticket resale", appliesTo: "listing tickets for resale and buying resale tickets" },
  waitlist_enabled: { label: "Waitlist", appliesTo: "joining a sold-out event's waitlist and checking out from a waitlist offer" },
  guestlist_enabled: { label: "Guestlist", appliesTo: null },
  notifications_enabled: { label: "Buyer notifications", appliesTo: null },
  series_enabled: { label: "Event series", appliesTo: null },
}

function infoFor(key: string): FlagInfo {
  return FLAG_INFO[key] ?? { label: key.replace(/_enabled$/, "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), appliesTo: null }
}

/**
 * Feature flags: one card per feature with its on/off switch for the whole
 * platform, and a list of organisations or events it is kept off for.
 */
export default async function FeatureFlagsPage() {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const canAct = roleTier !== "read_only_admin"
  const { flags, targets } = await getFeatureFlagBoard()
  const enforced = flags.filter((f) => infoFor(f.key).appliesTo)
  const notYet = flags.filter((f) => !infoFor(f.key).appliesTo)

  const card = (flag: (typeof flags)[number]) => (
    <FeatureFlagCard
      key={flag.key}
      flag={flag}
      info={infoFor(flag.key)}
      targets={targets}
      canAct={canAct}
      setAction={setFlagAction}
      addAction={addExclusionAction}
      removeAction={removeExclusionAction}
    />
  )

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Feature flags</h1>
        <p className="text-sm text-ink-3">
          Switch a feature on or off for the whole platform. When it&apos;s on, you can still keep it off for a particular organisation
          (all its events) or a single event. Changes apply straight away and are in the{" "}
          <Link href="/super-admin/audit" className="text-accent hover:underline">
            audit log
          </Link>
          .{canAct ? "" : " You have read-only access."}
        </p>
      </div>

      {flags.length === 0 ? <p className="text-sm text-ink-3">No platform feature flags yet.</p> : null}
      {enforced.length ? <div className="flex flex-col gap-3">{enforced.map(card)}</div> : null}
      {notYet.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="flags-not-yet">
          <div className="flex flex-col gap-0.5 pt-2">
            <h2 id="flags-not-yet" className="text-lg font-semibold tracking-tight text-ink">
              Not checked by the app yet
            </h2>
            <p className="text-[13px] text-ink-3">These switches are saved, but no page reads them yet, so they don&apos;t change anything today.</p>
          </div>
          {notYet.map(card)}
        </section>
      ) : null}
    </div>
  )
}
