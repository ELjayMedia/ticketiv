"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { Avatar } from "@/components/quiet/ui/primitives"
import type { AccountSettings } from "@/lib/data/attendee/account-settings"
import {
  deleteAccountAction,
  updateAvatarAction,
  updateNotificationPrefsAction,
  updatePasswordAction,
  updateProfileAction,
  type ActionResult,
  type DeleteAccountResult,
} from "@/app/(app)/account/settings/actions"

export type TabId = "profile" | "notifications" | "security"

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "profile", label: "Personal information", icon: "user" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "security", label: "Security", icon: "settings" },
]

export function AccountSettingsScreen({ settings, initialTab = "profile" }: { settings: AccountSettings; initialTab?: TabId }) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>(initialTab)

  function selectTab(nextTab: TabId) {
    setTab(nextTab)
    router.replace(`/account/settings?tab=${nextTab}`, { scroll: false })
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account</span>
        <h1 className="text-h1">Settings</h1>
        <p className="text-[13px] text-ink-3">
          Manage your personal information, notifications and security.
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
              onClick={() => selectTab(t.id)}
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
      <div className="flex flex-col gap-4">
        <AvatarUploader settings={settings} initials={initials} />

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
      </div>
    </Card>
  )
}

/* ── Avatar uploader ──────────────────────────────────────────── */
function AvatarUploader({ settings, initials }: { settings: AccountSettings; initials: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [preview, setPreview] = useState<string | null>(settings.avatarUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const formData = new FormData()
    formData.set("avatar", file)
    startTransition(async () => {
      const res = await updateAvatarAction(formData)
      setResult({ ok: res.ok, error: res.error })
      if (res.ok && res.url) setPreview(res.url)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar src={preview ?? undefined} label={initials} size={56} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-ink">Profile photo</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Uploading…" : preview ? "Change photo" : "Upload photo"}
          </Button>
          <StatusLine result={result} />
        </div>
        <span className="font-mono text-[10px] text-ink-3">JPG, PNG, WebP or GIF, up to 5 MB.</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onChange}
      />
    </div>
  )
}

/* ── Notifications ────────────────────────────────────────────── */
const CHANNELS: { key: keyof AccountSettings["notifications"]; field: string; label: string; description: string; icon: IconName }[] = [
  {
    key: "emailOptIn",
    field: "emailOptIn",
    label: "Email",
    description: "Receipts, transfers and offers by email",
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
    formData.set("eventRemindersEnabled", String(prefs.eventRemindersEnabled))
    formData.set("remind24h", String(prefs.remind24h))
    formData.set("remind2h", String(prefs.remind2h))
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

      <DeleteAccountSection settings={settings} />
    </div>
  )
}

function DeleteAccountSection({ settings }: { settings: AccountSettings }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<DeleteAccountResult | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const canSubmit = settings.deletion.canDelete && confirmation === "DELETE" && !pending

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setResult(null)
    startTransition(async () => {
      const res = await deleteAccountAction(formData)
      setResult(res)
      if (res.ok && res.deleted) {
        window.location.assign("/")
      }
    })
  }

  return (
    <Card className="border-danger/40 p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Icon name="trash" size={16} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">Delete account</h2>
            <p className="font-mono text-[11px] leading-relaxed text-ink-3">
              Your profile and sign-in account will be deleted. Paid order records stay in anonymised form for accounting.
            </p>
          </div>
        </div>

        {settings.deletion.blockers.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger-soft/50 px-3.5 py-3">
            <span className="text-[13px] font-semibold text-danger">Deletion is blocked</span>
            <ul className="flex flex-col gap-1.5">
              {settings.deletion.blockers.map((blocker) => (
                <li key={blocker.code} className="flex gap-2 text-[12px] leading-relaxed text-danger">
                  <Icon name="close" size={13} className="mt-0.5" />
                  <span>
                    {blocker.message}
                    {blocker.count > 1 ? ` (${blocker.count})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-line bg-bg px-3.5 py-3">
            <p className="font-mono text-[11px] leading-relaxed text-ink-3">
              {settings.deletion.retention.orders}
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Confirm deletion</span>
          <input
            name="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-danger focus:ring-2 focus:ring-danger/20"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <StatusLine result={result} />
          <Button
            type="submit"
            variant="default"
            size="md"
            disabled={!canSubmit}
            className="border-danger bg-danger text-white hover:bg-danger/90"
          >
            <Icon name="trash" size={14} />
            {pending ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
