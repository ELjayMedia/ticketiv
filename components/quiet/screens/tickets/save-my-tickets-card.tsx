"use client"

import * as React from "react"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { requestEmailClaimAction } from "@/app/(consumer)/tickets/claim-actions"

// TICK-78 — Claim CTA shown to anonymous buyers. Server-side identity check
// happens in the action; the parent page decides whether to render this card
// at all (only when the current user is anonymous).

export function SaveMyTicketsCard({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = React.useState(defaultEmail)
  const [pending, setPending] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setResult(null)
    const res = await requestEmailClaimAction(email)
    setResult(res)
    setPending(false)
  }

  if (result?.ok) {
    return (
      <Card>
        <CardBody className="flex items-start gap-3 p-5">
          <Icon name="check" size={18} className="mt-0.5 text-accent" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-ink">Almost there</p>
            <p className="text-[13px] text-ink-3">{result.message}</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Icon name="ticket" size={18} className="mt-0.5 text-ink-3" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-ink">Save your tickets for later</p>
            <p className="text-[13px] text-ink-3">
              Add your email so you can recover your tickets, transfer them, and open them on another device.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={pending}
            className="h-10 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[14px] placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-ink px-4 text-[14px] font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sending…" : "Save my tickets"}
          </button>
        </form>
        {result && !result.ok && (
          <p className="text-[12px] text-danger">{result.message}</p>
        )}
      </CardBody>
    </Card>
  )
}
