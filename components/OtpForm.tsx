"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { createClient } from "@/lib/supabase/client"

const RESEND_COOLDOWN_SECONDS = 60

function explainOtpError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many code requests were made. Wait a few minutes before requesting another code."
  }

  if (lower.includes("expired") || lower.includes("invalid")) {
    return "That code is invalid or has expired. Request a new code and use the latest one from your inbox."
  }

  return message
}

export function OtpForm() {
  const router = useRouter()
  const search = useSearchParams()
  const to = search?.get("to") ?? ""
  const mode = search?.get("mode") === "signup" ? "signup" : "login"

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => { refs.current[0]?.focus() }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  function setAt(i: number, val: string) {
    const next = [...digits]
    next[i] = val.replace(/\D/g, "").slice(0, 1)
    setDigits(next)
    setError(null)
    if (next[i] && i < 5) refs.current[i + 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const next = Array(6).fill("")
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    setError(null)
    refs.current[Math.min(text.length, 5)]?.focus()
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  async function bootstrapTicketivProfile() {
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error(userError?.message || "Unable to load verified user")
    }

    const { error: bootstrapError } = await supabase.rpc("fn_bootstrap_ticketiv_user", {
      p_user_id: user.id,
      p_email: user.email ?? to,
      p_phone: undefined,
      p_display_name: user.user_metadata?.display_name ?? null,
    })

    if (bootstrapError) {
      throw new Error(bootstrapError.message)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const token = digits.join("")

    if (token.length !== 6) {
      setError("Enter the full 6-digit code.")
      return
    }

    if (!to) {
      setError("Missing email address — go back and start over.")
      return
    }

    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email: to, token, type: "email" })

    if (error) {
      setBusy(false)
      setError(explainOtpError(error.message))
      return
    }

    try {
      await bootstrapTicketivProfile()
    } catch (profileError) {
      setBusy(false)
      setError(profileError instanceof Error ? profileError.message : "Unable to set up your Ticketiv profile")
      return
    }

    setBusy(false)

    const redirectTo = search?.get("redirectTo") || search?.get("from")
    router.push((redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/") as "/")
    router.refresh()
  }

  async function resend() {
    if (!to || cooldown > 0) return
    setError(null)
    setResending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: to,
      options: { shouldCreateUser: mode === "signup" },
    })
    setResending(false)

    if (error) {
      setError(explainOtpError(error.message))
      return
    }

    setDigits(Array(6).fill(""))
    refs.current[0]?.focus()
    setResent(true)
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onPaste={onPaste}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="h-14 w-full rounded-[var(--radius-md)] border border-line-2 bg-surface text-center text-[24px] font-semibold tabular-nums text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-ink-3">
          Use the latest code from your email. You can paste the full 6-digit code here.
        </p>
      </div>

      {resent && (
        <div className="rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
          New code sent. Check your inbox and spam folder.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
          <Icon name="close" size={14} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={busy || digits.some((d) => !d)}
        block
      >
        {busy ? "Verifying…" : mode === "signup" ? "Verify and create account" : "Verify and log in"}
      </Button>

      <div className="flex flex-col items-center gap-1 pt-2 text-[13px] text-ink-3">
        <span>Didn’t get it?</span>
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          className="font-semibold text-ink underline-offset-4 hover:underline disabled:opacity-60"
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  )
}
