"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"

export default function TeamInvitePage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("organizer_staff")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/orgs/${orgId}/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Failed to send invite. Please try again.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  const ROLES = [
    { value: "organizer_admin", label: "Admin", description: "Full access except billing" },
    { value: "organizer_staff", label: "Staff", description: "Manage events, view orders" },
    { value: "scanner", label: "Scanner", description: "Gate scanner only" },
    { value: "pos", label: "POS", description: "Door sales only" },
  ]

  if (sent) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="check" size={28} />
          </span>
          <h1 className="text-h1">Invite sent</h1>
          <p className="text-[14px] text-ink-3">
            {email} will receive an email to join your team.
          </p>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => { setSent(false); setEmail(""); }}>
              Invite another
            </Button>
            <Button variant="accent" onClick={() => router.push(`/orgs/${orgId}/team`)}>
              Back to team
            </Button>
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
            <label className="text-label mb-1.5 block">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
              disabled={submitting}
            />
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
            <p role="alert" className="text-[13px] text-danger">{error}</p>
          )}

          <Button type="submit" variant="accent" disabled={!email.trim() || submitting}>
            {submitting ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </div>
    </main>
  )
}
