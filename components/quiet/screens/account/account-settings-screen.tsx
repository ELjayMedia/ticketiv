"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { Avatar } from "@/components/quiet/ui/primitives"
import type { AccountSettings } from "@/lib/data/attendee/account-settings"
import {
  updateNotificationPrefsAction,
  updatePasswordAction,
  updateProfileAction,
  type ActionResult,
} from "@/app/(app)/account/settings/actions"

type TabId = "profile" | "notifications" | "security"

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "security", label: "Security", icon: "settings" },
]

export function AccountSettingsScreen({ settings }: { settings: AccountSettings }) {
  const [tab, setTab] = useState<TabId>("profile")

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account</span>
        <h1 className="text-h1">Settings</h1>
        <p className="text-[13px] text-ink-3">
          Manage your profile, notification preferences and security in one place.
        </p>
      </header>

      <nav className="flex gap-1 rounded-[var(--radius-md)] border border-line bg-surface p-1" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-semibold transition-colors " +
                (active ? "bg-ink text-surface" : "text-ink-3 hover:bg-bg")
              }
            >
              <Icon name={t.icon} size={15} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      {tab === "profile" && <ProfileSection settings={settings} />}
      {tab === "notifications" && <NotificationsSection settings={settings} />}
      {tab === "security" && <SecuritySection settings={settings} />}
    </main>
  )
}

/* ── Status line ──────────────────────────────────────────────── */
function StatusLine({ result }: { result: ActionResult | null }) {
  if (!result) return null
  return (
    <p
      className={
        "flex items-center gap-1.5 font-mono text-[11px] " +
        (result.ok ? "text-accent" : "text-danger")
      }
      role="status"
    >
      <Icon name={result.ok ? "check" : "close"} size={13} />
      {result.ok ? "Saved" : result.error ?? "Something went wrong"}
    </p>
  )
}

/* ── Profile ──────────────────────────────────────────────────── */
function ProfileSection({ settings }: { settings: AccountSettings }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setResult(null)
    startTransition(async () => {
      setResult(await updateProfileAction(formData))
    })
  }

  const initials =
    (settings.displayName || settings.name || settings.email || "Y")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar label={initials} size={56} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">Profile photo</span>
            <span className="font-mono text-[11px] text-ink-3">
              Photo uploads are coming soon — we show your initials for now.
            </span>
          </div>
        </div>

        <FormField
          label="Display name"
          name="displayName"
          defaultValue={settings.displayName}
          placeholder="How your name appears"
          autoComplete="nickname"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            name="name"
            defaultValue={settings.name}
            autoComplete="given-name"
          />
          <FormField
            label="Surname"
            name="surname"
            defaultValue={settings.surname}
            autoComplete="family-name"
          />
        </div>
        <FormField
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={settings.phone}
          placeholder="+268 ..."
          autoComplete="tel"
        />
        <FormField
          label="Email"
          value={settings.email ?? ""}
          disabled
          hint="Email is managed by your sign-in method."
          readOnly
        />

        <div className="flex items-center justify-between gap-3">
          <StatusLine result={result} />
          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ── Notifications ────────────────────────────────────────────── */
const CHANNELS: { key: keyof AccountSettings["notifications"]; field: string; label: string; description: string; icon: IconName }[] = [
  {
    key: "emailOptIn",
    field: "emailOptIn",
    label: "Email",
    description: "Receipts, reminders, transfers and offers by email",
    icon: "fileText",
  },
  {
    key: "smsOptIn",
    field: "smsOptIn",
    label: "SMS",
    description: "Time-sensitive updates by text message",
    icon: "share",
  },
  {
    key: "pushOptIn",
    field: "pushOptIn",
    label: "Push",
    description: "Push notifications on your devices",
    icon: "bell",
  },
  {
    key: "inAppOptIn",
    field: "inAppOptIn",
    label: "In-app",
    description: "Activity shown in your notifications inbox",
    icon: "zap",
  },
]

function NotificationsSection({ settings }: { settings: AccountSettings }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [prefs, setPrefs] = useState(settings.notifications)

  function toggle(key: keyof AccountSettings["notifications"]) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
    setResult(null)
  }

  function onSave() {
    const formData = new FormData()
    formData.set("emailOptIn", String(prefs.emailOptIn))
    formData.set("smsOptIn", String(prefs.smsOptIn))
    formData.set("pushOptIn", String(prefs.pushOptIn))
    formData.set("inAppOptIn", String(prefs.inAppOptIn))
    setResult(null)
    startTransition(async () => {
      setResult(await updateNotificationPrefsAction(formData))
    })
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3">
        {CHANNELS.map((c) => (
          <label
            key={c.key}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name={c.icon} size={15} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-ink">{c.label}</span>
                <span className="font-mono text-[10px] leading-relaxed text-ink-3">{c.description}</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs[c.key]}
              onChange={() => toggle(c.key)}
              aria-label={`Toggle ${c.label} notifications`}
              className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors checked:bg-accent before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-surface before:transition-transform checked:before:translate-x-[18px]"
            />
          </label>
        ))}

        <div className="flex items-center justify-between gap-3 pt-1">
          <StatusLine result={result} />
          <Button type="button" variant="primary" size="md" disabled={pending} onClick={onSave}>
            {pending ? "Saving…" : "Save notifications"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ── Security ─────────────────────────────────────────────────── */
function SecuritySection({ settings }: { settings: AccountSettings }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    setResult(null)
    startTransition(async () => {
      const res = await updatePasswordAction(formData)
      setResult(res)
      if (res.ok) form.reset()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h3">Change password</h2>
            <p className="font-mono text-[11px] text-ink-3">Use at least 8 characters.</p>
          </div>
          <FormField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <FormField
            label="Confirm new password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <div className="flex items-center justify-between gap-3">
            <StatusLine result={result} />
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h3">Connected accounts</h2>
            <p className="font-mono text-[11px] text-ink-3">Social sign-in methods linked to your account.</p>
          </div>
          {settings.connectedAccounts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-bg px-3.5 py-3">
              <Icon name="user" size={16} className="text-ink-3" />
              <span className="text-[13px] text-ink-3">
                No social accounts connected. You sign in with{" "}
                {settings.hasPassword ? "email and password" : "a magic link"}.
              </span>
            </div>
          ) : (
            settings.connectedAccounts.map((a) => (
              <div
                key={a.provider}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="globe" size={15} />
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-medium capitalize text-ink">{a.provider}</span>
                  {a.email && <span className="font-mono text-[11px] text-ink-3">{a.email}</span>}
                </span>
                <Icon name="check" size={16} className="text-accent" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
