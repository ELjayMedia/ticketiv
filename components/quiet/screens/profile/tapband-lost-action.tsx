"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { reportTapBandLostAction, type TapBandLostActionResult } from "@/app/(consumer)/me/tapband/actions"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

export function TapBandLostAction({ credentialId }: { credentialId: string }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [otp, setOtp] = useState("")
  const [result, setResult] = useState<TapBandLostActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setResult(null)
    const formData = new FormData()
    formData.set("credentialId", credentialId)
    formData.set("confirmation", confirmation)
    if (otp) formData.set("otp", otp)

    startTransition(async () => {
      const next = await reportTapBandLostAction(formData)
      setResult(next)
      if (next.ok) {
        setExpanded(false)
        router.refresh()
      }
    })
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-danger hover:bg-danger-soft"
        onClick={() => setExpanded(true)}
      >
        <Icon name="close" size={13} />
        Report lost
      </Button>
    )
  }

  return (
    <div className="rounded-[var(--radius)] border border-danger/30 bg-danger-soft/60 p-3">
      <div className="flex flex-col gap-2">
        <p className="text-[12px] leading-relaxed text-ink-2">
          This stops TapBand entry immediately. Your tickets stay in your account and QR access remains available.
        </p>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Type LOST"
          className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 font-mono text-[13px] uppercase text-ink outline-none focus:border-danger focus:ring-2 focus:ring-danger/20"
          autoComplete="off"
        />
        {result?.otpRequired && (
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Email code"
            inputMode="numeric"
            className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoComplete="one-time-code"
          />
        )}
        {result && (
          <p
            className={
              "flex items-center gap-1.5 font-mono text-[11px] " +
              (result.ok ? "text-accent" : result.otpRequired && !result.error ? "text-ink-3" : "text-danger")
            }
            role="status"
          >
            <Icon name={result.ok ? "check" : result.otpRequired && !result.error ? "bell" : "close"} size={13} />
            {result.message ?? result.error ?? "Something went wrong"}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setExpanded(false)
              setResult(null)
              setOtp("")
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={pending}
            className="border-danger text-danger hover:bg-danger-soft"
            onClick={submit}
          >
            {pending ? "Checking..." : result?.otpRequired ? "Verify and report" : "Send code"}
          </Button>
        </div>
      </div>
    </div>
  )
}
