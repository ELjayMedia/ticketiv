"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { isValidEmail } from "@/lib/auth/organizer-signup"
import { createClient } from "@/lib/supabase/client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address, for example name@example.com.")
      return
    }

    setBusy(true)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
    setBusy(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-3 text-[13px] text-ink-2">
          <Icon name="check" size={14} className="mt-0.5 text-accent" />
          <span>Check your email for the secure password-reset link. This is a link, not a login OTP.</span>
        </div>
        <Link href="/login" className="text-center text-[13px] font-semibold text-ink underline-offset-4 hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormField
        label="Account email *"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => { setEmail(event.target.value); setError(null) }}
        required
        hint="We will email a secure link so you can choose a new password."
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
          <Icon name="close" size={14} className="mt-0.5" /><span>{error}</span>
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={busy || !email} block>
        {busy ? "Sending reset link…" : "Send password reset link"}
      </Button>
    </form>
  )
}
