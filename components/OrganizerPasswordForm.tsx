"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { completeOrganizerSignup, readOrganizerSignup } from "@/lib/auth/organizer-signup-client"
import { createClient } from "@/lib/supabase/client"

export function OrganizerPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }

    const signup = readOrganizerSignup()
    if (!signup) {
      setError("Your organizer registration details are no longer available. Return and register again.")
      return
    }

    setBusy(true)
    const supabase = createClient()
    // The session from the email code is in this browser; read it locally. The
    // password update and profile RPC are verified server-side by Supabase.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user

    if (!user) {
      setBusy(false)
      setError("Your verified organizer session has expired. Return and register again.")
      return
    }

    if (user.email?.trim().toLowerCase() !== signup.email) {
      setBusy(false)
      setError("The verified account does not match the organizer registration email.")
      return
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password })
    if (passwordError) {
      setBusy(false)
      setError(passwordError.message)
      return
    }

    try {
      await completeOrganizerSignup(supabase, signup)
    } catch (completionError) {
      setBusy(false)
      setError(completionError instanceof Error ? completionError.message : "Unable to set up the organizer profile")
      return
    }

    router.push("/onboarding/organizer")
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormField
        label="Password *"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(event) => { setPassword(event.target.value); setError(null) }}
        minLength={8}
        required
        hint="Use this password for future Ticketiv logins. No login OTP will be sent."
      />
      <FormField
        label="Confirm password *"
        type="password"
        autoComplete="new-password"
        placeholder="Repeat your password"
        value={confirmPassword}
        onChange={(event) => { setConfirmPassword(event.target.value); setError(null) }}
        minLength={8}
        required
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
          <Icon name="close" size={14} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={busy || !password || !confirmPassword} block>
        {busy ? "Creating organizer profile…" : "Set password and continue"}
        <Icon name="arrowR" size={14} />
      </Button>

      <Link href="/organizer/register" className="text-center text-[13px] text-ink-3 underline-offset-4 hover:underline">
        Start organizer registration again
      </Link>
    </form>
  )
}
