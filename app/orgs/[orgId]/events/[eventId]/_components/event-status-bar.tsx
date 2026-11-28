"use client"

import { useRouter } from "next/navigation"

import { EventStatusControls } from "./event-status-controls"

/** Pause / resume sales, cancel and archive, on the event overview. */
export function EventStatusBar(props: { orgId: string; eventId: string; status: string; issuedTickets: number }) {
  const router = useRouter()
  return <EventStatusControls {...props} onSuccess={() => router.refresh()} />
}
