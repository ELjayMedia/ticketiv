"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Channel = "phone" | "email"

const ESWATINI_DIAL = "+268"

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, "")
  if (cleaned.startsWith("+")) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null
  }
  const local = cleaned.replace(/^0+/, "")
  const candidate = `${ESWATINI_DIAL}${local}`
  return /^\+\d{8,15}$/.test(candidate) ? candidate : null
}

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

export function SignInForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [channel, setChannel] = useState<Channel>("phone")
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const supabase = createClient()

    if (channel === "phone") {
      const phone = normalizePhone(value)
      if (!phone) {
        setError("That phone number doesn't look right. Try your number without the country code, or include +268.")
        return
      }
      setBusy(true)
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: "sms" },
      })
      setBusy(false)
      if (error) { setError(error.message); return }
      const params = new URLSearchParams({ channel: "phone", to: phone })
      const from = search.get("from")
      if (from) params.set("from", from)
      router.push(`/verify?${params.toString()}`)
      return
    }

    const email = value.trim().toLowerCase()
    if (!isValidEmail(email)) {
      setError("That email doesn't look right.")
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    const params = new URLSearchParams({ channel: "email", to: email })
    const from = search.get("from")
    if (from) params.set("from", from)
    router.push(`/verify?${params.toString()}`)
  }

  const tabBase = "rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-medium transition-colors"
  const tabActive = `${tabBase} bg-[var(--color-ink)] text-[var(--color-cream)]`
  const tabInactive = `${tabBase} text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]`

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Channel toggle */}
      <div className="inline-flex self-start rounded-[var(--radius-pill)] border border-[var(--color-paper-line)] bg-[var(--color-cream-deep)] p-1">
        <button type="button" onClick={() => { setChannel("phone"); setValue(""); setError(null) }} className={channel === "phone" ? tabActive : tabInactive}>
          Phone
        </button>
        <button type="button" onClick={() => { setChannel("email"); setValue(""); setError(null) }} className={channel === "email" ? tabActive : tabInactive}>
          Email
        </button>
      </div>

      {/* Input */}
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
          {channel === "phone" ? "Phone number" : "Email address"}
        </span>
        <div className="flex items-stretch rounded-[var(--radius-soft)] border border-[var(--color-paper-line)] bg-white/40 backdrop-blur-sm focus-within:border-[var(--color-saffron)]">
          {channel === "phone" && (
            <span className="flex items-center border-r border-[var(--color-paper-line)] px-3 text-sm text-[var(--color-ink-soft)]">
              {ESWATINI_DIAL}
            </span>
          )}
          <input
            type={channel === "phone" ? "tel" : "email"}
            inputMode={channel === "phone" ? "tel" : "email"}
            autoComplete={channel === "phone" ? "tel" : "email"}
            placeholder={channel === "phone" ? "76 12 34 56" : "you@example.com"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent px-3 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)] focus:outline-none"
            required
          />
        </div>
        <span className="text-xs text-[var(--color-ink-mute)]">
          {channel === "phone"
            ? "We'll send a 6-digit code by SMS. No country code needed for Eswatini numbers."
            : "We'll send a 6-digit code to your inbox."}
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-[var(--color-saffron)] bg-[var(--color-saffron)]/10 px-3 py-2 text-sm text-[var(--color-ink)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !value}
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-ink)] px-6 text-[15px] font-medium text-[var(--color-cream)] transition-colors hover:bg-[var(--color-forest-deep)] focus-visible:bg-[var(--color-forest-deep)] disabled:cursor-not-allowed disabled:bg-[var(--color-ink-mute)]"
      >
        {busy ? "Sending…" : "Send code"}
      </button>
    </form>
  )
}
