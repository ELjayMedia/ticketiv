import Link from "next/link"
import { Icon } from "@/components/quiet/ui/icon"
import { Card } from "@/components/quiet/ui/card"
import { Photo } from "@/components/quiet/ui/primitives"
import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page"
import { getFavourites } from "@/lib/data/attendee/favourites"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const metadata = { title: "Favourites" }
export const dynamic = "force-dynamic"

export default async function FavouritesPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  if (!user) {
    return (
      <AccountEmptyPage
        eyebrow="Saved events"
        title="Favourites"
        description="Sign in to save events you want to come back to before tickets sell out."
        icon="heart"
        primaryHref="/login?next=/favourites"
        primaryLabel="Sign in"
        secondaryHref="/"
        secondaryLabel="Browse events"
        bullets={[
          "Save events from discovery and event detail",
          "Get back to them before tickets sell out",
          "Follow series and organisers",
        ]}
      />
    )
  }

  const favourites = await getFavourites()

  if (favourites.length === 0) {
    return (
      <AccountEmptyPage
        eyebrow="Saved events"
        title="Favourites"
        description="Events you save from discovery and event detail will live here, so you can come back before tickets sell out."
        icon="heart"
        primaryHref="/"
        primaryLabel="Find events"
        secondaryHref="/me"
        secondaryLabel="Account"
        bullets={[
          "Saved events from discovery",
          "Followed series and organisers",
          "Upcoming events you may want to buy later",
        ]}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[480px] pb-24">
      <div className="h-14" />

      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-label">Saved events</span>
          <span className="text-h1 mt-0.5">
            Favourites · {favourites.length}
          </span>
        </div>
      </header>

      <ul className="flex flex-col gap-2 px-5">
        {favourites.map((ev) => (
          <li key={ev.id}>
            <Link href={`/events/${ev.slug}`}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-bg" flat>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)]">
                  <Photo src={ev.photo} height={48} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-semibold">
                    {ev.title}
                  </span>
                  <span className="truncate font-mono text-[11px] text-ink-3">
                    {ev.whenLabel}
                  </span>
                  <span className="truncate font-mono text-[11px] text-ink-3">
                    {ev.venueName}
                    {ev.city ? ` · ${ev.city}` : ""}
                  </span>
                </div>
                <Icon name="chevR" size={16} className="shrink-0 text-ink-3" aria-hidden />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
