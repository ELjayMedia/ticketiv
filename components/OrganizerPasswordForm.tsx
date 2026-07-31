"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import {
  ORGANIZER_SIGNUP_STORAGE_KEY,
  ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY,
  normalizeOrganizerSignup,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "@/lib/auth/organizer-signup"
import { createClient } from "@/lib/supabase/client"

interface OrganizerSignupRpcClient {
  rpc(name: string, args: Record<string, string | null>): Promise<{ error: { message: string } | null }>
}

function readOrganizerSignup(): OrganizerSignupPayload | null {
  const raw = window.sessionStorage.getItem(ORGANIZER_SIGNUP_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<OrganizerSignupPayload>
    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.surname !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.idNumber !== "string"
    ) return null

    const normalized = normalizeOrganizerSignup(parsed as OrganizerSignupPayload)
    return validateOrganizerSignup(normalized) ? null : normalized
  } catch {
    return null
  }
}

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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
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

    const rpcClient = supabase as unknown as OrganizerSignupRpcClient
    const { error: completionError } = await rpcClient.rpc("fn_complete_organizer_signup", {
      p_first_name: signup.firstName,
      p_surname: signup.surname,
      p_phone: signup.phone,
      p_id_number: signup.idNumber || null,
    })

    if (completionError) {
      setBusy(false)
      setError(completionError.message)
      return
    }

    window.sessionStorage.removeItem(ORGANIZER_SIGNUP_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY)
    setBusy(false)
    router.push("/onboarding/organizer")
    router.refresh()
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
