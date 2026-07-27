"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { buildTicketivPublicUrl } from "@/lib/public-url"
import { createOrgInviteAction } from "./actions"

type OrgRole = "organizer_admin" | "organizer_staff" | "finance"

const ROLES: { value: OrgRole; label: string; description: string }[] = [
  { value: "organizer_admin", label: "Admin", description: "Full access except billing" },
  { value: "organizer_staff", label: "Staff", description: "Manage events, view orders" },
  { value: "finance", label: "Finance", description: "Payouts and financial reports" },
]

export default function TeamInvitePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<OrgRole>("organizer_staff")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [inviteLink, setInviteLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await createOrgInviteAction({ orgId, role, email: email || null })
      if (!res.ok || !res.token) {
        setError(res.error ?? "Failed to create invite. Please try again.")
      } else {
        setInviteLink(buildTicketivPublicUrl(`/invite/${res.token}`, window.location.origin))
      }
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (inviteLink) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="check" size={28} />
          </span>
          <h1 className="text-h1">Invite ready</h1>
          <p className="text-[14px] text-ink-3">
            Share this link with your {ROLES.find((r) => r.value === role)?.label.toLowerCase()}. Whoever
            opens it and signs in joins your team — it works even if their login email differs.
          </p>
          <Card className="flex w-full items-center gap-2 p-3">
            <span className="flex-1 truncate text-left font-mono text-[12px] text-ink-2">{inviteLink}</span>
            <Button variant="default" size="sm" onClick={copyLink}>
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? "Copied" : "Copy"}
            </Button>
          </Card>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => {
                setInviteLink(null)
                setEmail("")
              }}
            >
              Invite another
            </Button>
            <Link href={`/orgs/${orgId}/team`}>
              <Button variant="accent">Back to team</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-lg p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/team`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <h1 className="text-h1">Invite team member</h1>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col gap-5">
          <Card className="p-5">
            <label className="text-label mb-1.5 block">Email address (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
              disabled={submitting}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">
              For your reference only — the invite binds to whoever accepts the link.
            </p>
          </Card>

          <Card className="p-5">
            <div className="text-label mb-3">Role</div>
            <div className="flex flex-col gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={
                    "flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors " +
                    (role === r.value
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:border-line-2")
                  }
                >
                  <span
                    className={
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 " +
                      (role === r.value ? "border-accent bg-accent" : "border-line-2")
                    }
                  />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-semibold">{r.label}</span>
                    <span className="text-[12px] text-ink-3">{r.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? "Creating…" : "Create invite link"}
          </Button>
        </form>
      </div>
    </main>
  )
}
