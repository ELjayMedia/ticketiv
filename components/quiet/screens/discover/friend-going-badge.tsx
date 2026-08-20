"use client"

import * as React from "react"

import {
  getEventFriendSignalsAction,
  type EventFriendSignal,
} from "@/app/(focused)/events/[id]/social-actions"
import { Icon } from "@/components/quiet/ui/icon"

const signalCache = new Map<string, EventFriendSignal | null>()
const queuedIds = new Set<string>()
const listeners = new Map<string, Set<(signal: EventFriendSignal | null) => void>>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushSignals()
  }, 0)
}

async function flushSignals() {
  const ids = Array.from(queuedIds).slice(0, 50)
  for (const id of ids) queuedIds.delete(id)
  if (ids.length === 0) return

  let result: Awaited<ReturnType<typeof getEventFriendSignalsAction>> | null = null
  try {
    result = await getEventFriendSignalsAction(ids)
  } catch {
    result = null
  }

  const byEvent = new Map(
    result?.ok ? result.signals.map((signal) => [signal.eventId, signal] as const) : [],
  )

  for (const id of ids) {
    const signal = byEvent.get(id) ?? null
    signalCache.set(id, signal)
    const callbacks = listeners.get(id)
    if (callbacks) {
      for (const callback of callbacks) callback(signal)
      listeners.delete(id)
    }
  }

  if (queuedIds.size > 0) scheduleFlush()
}

function requestSignal(eventId: string, callback: (signal: EventFriendSignal | null) => void) {
  if (signalCache.has(eventId)) {
    callback(signalCache.get(eventId) ?? null)
    return () => {}
  }

  const eventListeners = listeners.get(eventId) ?? new Set<(signal: EventFriendSignal | null) => void>()
  eventListeners.add(callback)
  listeners.set(eventId, eventListeners)
  queuedIds.add(eventId)
  scheduleFlush()

  return () => {
    const current = listeners.get(eventId)
    current?.delete(callback)
    if (current?.size === 0) listeners.delete(eventId)
  }
}

export function FriendGoingBadge({
  eventId,
  compact = false,
}: {
  eventId: string | null | undefined
  compact?: boolean
}) {
  const [signal, setSignal] = React.useState<EventFriendSignal | null | undefined>(() =>
    eventId && signalCache.has(eventId) ? signalCache.get(eventId) ?? null : undefined,
  )

  React.useEffect(() => {
    if (!eventId) {
      setSignal(null)
      return
    }

    setSignal(signalCache.has(eventId) ? signalCache.get(eventId) ?? null : undefined)
    return requestSignal(eventId, setSignal)
  }, [eventId])

  if (!signal || signal.friendCount <= 0) return null

  const firstName = signal.friendNames[0]?.trim()
  const label = firstName
    ? signal.friendCount === 1
      ? `${firstName} is going`
      : `${firstName} + ${signal.friendCount - 1} going`
    : `${signal.friendCount} friend${signal.friendCount === 1 ? "" : "s"} going`

  return (
    <span
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9px] font-semibold text-accent"
          : "inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-semibold text-accent"
      }
      title={signal.friendNames.length > 0 ? signal.friendNames.join(", ") : undefined}
    >
      <Icon name="users" size={compact ? 10 : 11} />
      <span className="truncate">{label}</span>
    </span>
  )
}
