"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import type { NotificationPrefs } from "@/lib/data/attendee/account-settings"
import {
  updateNotificationPrefsAction,
  type ActionResult,
} from "@/app/(app)/account/settings/actions"

const CHANNELS: {
  key: keyof NotificationPrefs
  label: string
  description: string
  icon: IconName
}[] = [
  { key: "pushOptIn", label: "Push", description: "Reminders on your devices", icon: "bell" },
  { key: "inAppOptIn", label: "In-app", description: "Shown in your notifications inbox", icon: "zap" },
  { key: "emailOptIn", label: "Email", description: "Reminders by email", icon: "fileText" },
  { key: "smsOptIn", label: "SMS", description: "Time-sensitive reminders by text", icon: "share" },
]

export function RemindersScreen({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const anyOn = prefs.pushOptIn || prefs.inAppOptIn || prefs.emailOptIn || prefs.smsOptIn

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
    setResult(null)
  }

  function setAll(value: boolean) {
    setPrefs((p) => ({
      ...p,
      emailOptIn: value,
      smsOptIn: value,
      pushOptIn: value,
      inAppOptIn: value,
    }))
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Profile</span>
        <h1 className="text-h1">Reminders</h1>
        <p className="text-[13px] text-ink-3">
          Choose how we remind you about events you&apos;re attending so you never miss the door.
        </p>
      </header>

      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-ink">Event reminders</span>
              <span className="font-mono text-[11px] text-ink-3">
                {anyOn ? "On — delivered on the channels below" : "Off on every channel"}
              </span>
            </div>
            <Button
              type="button"
              variant={anyOn ? "outline" : "primary"}
              size="sm"
              onClick={() => setAll(!anyOn)}
            >
              {anyOn ? "Turn all off" : "Turn all on"}
            </Button>
          </div>

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
                    <span className="font-mono text-[10px] leading-relaxed text-ink-3">
                      {c.description}
                    </span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={prefs[c.key]}
                  onChange={() => toggle(c.key)}
                  aria-label={`Toggle ${c.label} reminders`}
                  className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors checked:bg-accent before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-surface before:transition-transform checked:before:translate-x-[18px]"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {result ? (
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
            ) : (
              <span />
            )}
            <Button type="button" variant="primary" size="md" disabled={pending} onClick={onSave}>
              {pending ? "Saving…" : "Save reminders"}
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-center font-mono text-[11px] text-ink-3">
        Manage all notification channels in{" "}
        <Link href="/account/settings" className="text-accent hover:underline">
          Account settings
        </Link>
        .
      </p>
    </main>
  )
}
