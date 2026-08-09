"use client"

import * as React from "react"
import { Icon } from "@/components/quiet/ui/icon"

const AUTO_COMPLETE_MS = 3_200

export function CheckInCelebration({
  eventTitle,
  checkedInAt,
  onComplete,
}: {
  eventTitle: string
  checkedInAt: string
  onComplete: () => void
}) {
  const completedRef = React.useRef(false)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const finish = React.useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current()
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(finish, AUTO_COMPLETE_MS)
    return () => window.clearTimeout(timer)
  }, [finish])

  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(checkedInAt))

  return (
    <div
      className="fixed inset-0 z-[120] flex min-h-dvh flex-col overflow-hidden bg-accent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white"
      role="status"
      aria-live="assertive"
      aria-label={`Checked in for ${eventTitle}`}
    >
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full border border-white/15 motion-safe:animate-pulse" />
      <div className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full border border-white/15 motion-safe:animate-pulse" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-white/30 motion-safe:animate-ping" />
          <span className="absolute inset-4 rounded-full border border-white/40 motion-safe:animate-pulse" />
          <span className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-white text-accent shadow-[0_24px_80px_rgba(0,0,0,0.22)] motion-safe:animate-[bounce_900ms_ease-out_1]">
            <Icon name="check" size={50} />
          </span>
        </div>

        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
          Entry confirmed
        </p>
        <h1 className="mt-3 text-[38px] font-semibold leading-none tracking-[-0.04em]">
          You’re checked in
        </h1>
        <p className="mt-4 max-w-[320px] text-[16px] font-medium text-white/90">
          {eventTitle}
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-white/65">
          Scanned at {timeLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={finish}
        className="relative inline-flex w-full items-center justify-center rounded-[var(--radius-md)] bg-white px-4 py-3.5 text-[14px] font-semibold text-accent shadow-lg transition-transform active:scale-[0.98]"
      >
        View in Past tickets
      </button>
    </div>
  )
}
