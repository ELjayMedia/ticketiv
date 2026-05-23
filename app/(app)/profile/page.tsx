"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { Avatar, Divider } from "@/components/quiet/ui/primitives"
import { createClient } from "@/lib/supabase"

interface ProfileData {
  name: string
  avatar_url?: string
  friends_count: number
}

interface Row {
  icon: IconName
  label: string
  onClick?: () => void
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = (await supabase?.auth.getSession()) || { data: { session: null } }
        if (!session) {
          router.push("/login")
          return
        }
        setProfile({
          name: "Smit modl",
          avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
          friends_count: 10,
        })
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-[14px] text-ink-3">
        Loading…
      </main>
    )
  }

  const accountRows: Row[] = [
    { icon: "user", label: "Personal information" },
    { icon: "globe", label: "Language" },
    { icon: "users", label: "My friends" },
    { icon: "share", label: "Invite friends" },
  ]

  const moreRows: Row[] = [
    { icon: "spark", label: "Help centre" },
    { icon: "fileText", label: "Privacy policy" },
    { icon: "arrowR", label: "Logout", onClick: handleLogout },
  ]

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <Card>
        <div className="flex flex-col items-center gap-3 px-6 py-8">
          <Avatar src={profile?.avatar_url} alt={profile?.name} size={96} label={profile?.name?.[0]?.toUpperCase()} />
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-h1">{profile?.name}</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {profile?.friends_count} Friends
            </p>
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">My account</h2>
        <Card>
          {accountRows.map((row, i) => (
            <div key={row.label}>
              {i > 0 && <Divider />}
              <button
                type="button"
                onClick={row.onClick}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-bg"
              >
                <Icon name={row.icon} size={18} className="text-ink-3" />
                <span className="text-[14px] font-medium text-ink">{row.label}</span>
              </button>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Notifications</h2>
        <Card>
          <label className="flex w-full items-center justify-between gap-3 px-5 py-4">
            <span className="flex items-center gap-3">
              <Icon name="bell" size={18} className="text-ink-3" />
              <span className="text-[14px] font-medium text-ink">Push notifications</span>
            </span>
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors checked:bg-accent before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-surface before:transition-transform checked:before:translate-x-[18px]"
              aria-label="Toggle push notifications"
            />
          </label>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">More</h2>
        <Card>
          {moreRows.map((row, i) => (
            <div key={row.label}>
              {i > 0 && <Divider />}
              <button
                type="button"
                onClick={row.onClick}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-bg"
              >
                <Icon name={row.icon} size={18} className="text-ink-3" />
                <span className="text-[14px] font-medium text-ink">{row.label}</span>
              </button>
            </div>
          ))}
        </Card>
      </section>
    </main>
  )
}
