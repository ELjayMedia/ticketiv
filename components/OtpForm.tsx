"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const to = search.get("to") ?? ""
  const mode = search.get("mode") === "signup" ? "signup" : "login"

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
      p_phone: null,
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

    const redirectTo = search.get("redirectTo") || search.get("from")
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
      <div className="space-y-2">
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
              className="h-14 w-full rounded-[var(--radius-soft)] border border-border bg-card/80 text-center font-[family-name:var(--font-display)] text-2xl text-foreground focus:border-primary focus:outline-none"
              style={{ fontVariationSettings: "'opsz' 144" }}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Use the latest code from your email. You can paste the full 6-digit code here.</p>
      </div>

      {resent && (
        <p className="rounded-[var(--radius-soft)] border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
          New code sent. Check your inbox and spam folder.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || digits.some((d) => !d)}
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Verifying…" : mode === "signup" ? "Verify and create account" : "Verify and log in"}
      </button>

      <div className="flex flex-col items-center gap-1 pt-2 text-sm text-muted-foreground">
        <span>Didn't get it?</span>
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-60"
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  )
}
