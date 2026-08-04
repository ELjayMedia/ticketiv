"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { Logo } from "@/components/Logo"
import { buildTicketivPublicUrl } from "@/lib/public-url"
import { createClient } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      if (!email.trim()) {
        setError("Please enter your email address")
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        return
      }

      const supabase = createClient()

      if (!supabase) {
        setError("Authentication service is not configured")
        return
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildTicketivPublicUrl(
          "/auth/callback?next=/reset-password",
          window.location.origin,
        ),
      })

      if (resetError) {
        setError(resetError.message || "Failed to send reset email")
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account recovery</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          Reset your password.
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-ink-3">
          Enter the email on your account and we’ll send a secure reset link.
        </p>

        {success ? (
          <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-bg p-4">
            <Icon name="check" size={16} className="mt-0.5 text-success" />
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-semibold text-ink">Reset link sent.</p>
              <p className="text-[13px] text-ink-3">
                Check your inbox and follow the instructions. The link expires shortly — open it on the same device.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                <Icon name="close" size={14} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <FormField
              label="Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />

            <Button type="submit" variant="primary" size="md" disabled={loading} block>
              {loading ? "Sending reset link…" : "Send reset link"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-1.5 self-start text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Back to login
        </Link>
      </section>
    </main>
  )
}
