"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import {
  ORGANIZER_SIGNUP_STORAGE_KEY,
  ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY,
  normalizeOrganizerSignup,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "@/lib/auth/organizer-signup"
import { createClient } from "@/lib/supabase/client"

const RESEND_COOLDOWN_SECONDS = 60

interface OrganizerSignupRpcClient {
  rpc(name: string, args: Record<string, string | null>): Promise<{ error: { message: string } | null }>
}

function explainOtpError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many code requests were made. Wait a few minutes before requesting another code."
  if (lower.includes("expired") || lower.includes("invalid")) return "That code is invalid or has expired. Request a new code and use the latest one from your inbox."
  return message
}

function readOrganizerSignup(): OrganizerSignupPayload | null {
  const raw = window.sessionStorage.getItem(ORGANIZER_SIGNUP_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<OrganizerSignupPayload>
    if (typeof parsed.firstName !== "string" || typeof parsed.surname !== "string" || typeof parsed.phone !== "string" || typeof parsed.email !== "string" || typeof parsed.idNumber !== "string") return null
    const normalized = normalizeOrganizerSignup(parsed as OrganizerSignupPayload)
    return validateOrganizerSignup(normalized) ? null : normalized
  } catch {
    return null
  }
}

export function OtpForm() {
  const router = useRouter()
  const search = useSearchParams()
  const to = search?.get("to") ?? ""
  const isOrganizerSignup = search?.get("intent") === "organizer"
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

  function setAt(i: number, value: string) {
    const next = [...digits]
    next[i] = value.replace(/\D/g, "").slice(0, 1)
    setDigits(next)
    setError(null)
    if (next[i] && i < 5) refs.current[i + 1]?.focus()
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const next = Array(6).fill("")
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    setError(null)
    refs.current[Math.min(text.length, 5)]?.focus()
  }

  function onKeyDown(i: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  async function completeOrganizerSignup() {
    const signup = readOrganizerSignup()
    if (!signup) throw new Error("Your organizer registration details are no longer available. Return to organizer registration and enter them again.")
    if (signup.email !== to.trim().toLowerCase()) throw new Error("The verified email does not match the organizer registration.")

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error(userError?.message || "Unable to load the verified organizer")

    const rpcClient = supabase as unknown as OrganizerSignupRpcClient
    const { error: completionError } = await rpcClient.rpc("fn_complete_organizer_signup", {
      p_first_name: signup.firstName,
      p_surname: signup.surname,
      p_phone: signup.phone,
      p_id_number: signup.idNumber || null,
    })
    if (completionError) throw new Error(completionError.message)
    window.sessionStorage.removeItem(ORGANIZER_SIGNUP_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const token = digits.join("")
    if (!isOrganizerSignup) return setError("Email OTP is only available for organizer registration.")
    if (token.length !== 6) return setError("Enter the full 6-digit code.")
    if (!to) return setError("Missing organizer email address. Return and start again.")

    setBusy(true)
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: to, token, type: "email" })
    if (verifyError) {
      setBusy(false)
      setError(explainOtpError(verifyError.message))
      return
    }

    const wasAuthenticated = window.sessionStorage.getItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY) === "1"
    if (!wasAuthenticated) {
      setBusy(false)
      router.push("/organizer/set-password")
      router.refresh()
      return
    }

    try {
      await completeOrganizerSignup()
    } catch (profileError) {
      setBusy(false)
      setError(profileError instanceof Error ? profileError.message : "Unable to set up the organizer profile")
      return
    }

    setBusy(false)
    const requestedRedirect = search?.get("redirectTo") || search?.get("from")
    const redirectTo = requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : "/onboarding/organizer"
    router.push(redirectTo as "/onboarding/organizer")
    router.refresh()
  }

  async function resend() {
    if (!to || cooldown > 0 || !isOrganizerSignup) return
    setError(null)
    const signup = readOrganizerSignup()
    if (!signup) return setError("Your organizer registration details are no longer available. Return and enter them again.")

    setResending(true)
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: to,
      options: {
        shouldCreateUser: true,
        data: { first_name: signup.firstName, surname: signup.surname, phone: signup.phone, signup_intent: "organizer" },
      },
    })
    setResending(false)
    if (resendError) return setError(explainOtpError(resendError.message))

    setDigits(Array(6).fill(""))
    refs.current[0]?.focus()
    setResent(true)
    setCooldown(RESEND_COOLDOWN_SECONDS)
    window.setTimeout(() => setResent(false), 4000)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          {digits.map((digit, i) => (
            <input key={i} ref={(element) => { refs.current[i] = element }} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={1} value={digit} onChange={(event) => setAt(i, event.target.value)} onPaste={onPaste} onKeyDown={(event) => onKeyDown(i, event)} className="h-14 w-full rounded-[var(--radius-md)] border border-line-2 bg-surface text-center text-[24px] font-semibold tabular-nums text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft" aria-label={`Digit ${i + 1}`} />
          ))}
        </div>
        <p className="font-mono text-[11px] text-ink-3">Use the latest organizer verification code from your email.</p>
      </div>
      {resent && <div className="rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">New organizer verification code sent.</div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger"><Icon name="close" size={14} className="mt-0.5" /><span>{error}</span></div>}
      <Button type="submit" variant="primary" size="md" disabled={busy || digits.some((digit) => !digit) || !isOrganizerSignup} block>{busy ? "Verifying…" : "Verify organizer email"}</Button>
      <div className="flex flex-col items-center gap-1 pt-2 text-[13px] text-ink-3">
        <span>Didn’t get it?</span>
        <button type="button" onClick={resend} disabled={resending || cooldown > 0} className="font-semibold text-ink underline-offset-4 hover:underline disabled:opacity-60">{resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
      </div>
    </form>
  )
}
