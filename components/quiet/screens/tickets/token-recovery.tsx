import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import type { VerificationFailure } from "@/lib/ticket-tokens"

// Shared recovery screen for /t and /o token routes. Renders a safe,
// non-technical message and points the user toward sign-in / support.

const COPY: Record<VerificationFailure, { title: string; body: string }> = {
  missing_secret: {
    title: "Ticket links are temporarily unavailable",
    body: "Open your ticket from the Ticketiv app — it's saved under My Tickets on the device you used to buy.",
  },
  malformed: {
    title: "This ticket link looks broken",
    body: "Try opening the link again from the original message, or sign in to find it under My Tickets.",
  },
  bad_signature: {
    title: "This ticket link can't be verified",
    body: "For your security, this link is no longer active. Sign in with the phone or email used at checkout to recover your ticket.",
  },
  expired: {
    title: "This ticket link has expired",
    body: "For your security, this link is no longer active. Sign in with the phone or email used at checkout to recover your ticket.",
  },
  unsupported_version: {
    title: "This ticket link is out of date",
    body: "Open Ticketiv and find your ticket under My Tickets, or contact support if you can't sign in.",
  },
}

export function TokenRecoveryScreen({ reason }: { reason: VerificationFailure }) {
  const c = COPY[reason]
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <Card className="max-w-md">
        <CardBody className="flex flex-col gap-4 p-6 text-center">
          <Icon name="ticket" size={28} className="mx-auto text-ink-3" />
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-[14px] text-ink-3">{c.body}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/tickets"
              className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-[14px] font-semibold text-bg"
            >
              Sign in to My Tickets
            </Link>
            <Link href="/support" className="text-[13px] text-ink-3">
              Contact support
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
