"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { Logo } from "@/components/Logo"

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      router.push("/forgot-password")
    }
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSuccess(true)

      setTimeout(() => {
        router.push("/login?message=password-reset")
      }, 2000)
    } catch {
      setError("Failed to reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center pb-24 pt-12 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="check" size={28} />
          </span>
          <h1 className="mt-6 text-[28px] font-semibold leading-[1.1] tracking-tight text-ink">
            Password reset.
          </h1>
          <p className="mt-3 text-[14px] text-ink-3">Your password has been successfully reset.</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-4">Redirecting to login…</p>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">New password</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          Set a new password.
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-ink-3">
          Use at least 8 characters. We’ll log you in after you confirm.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-label">New password</span>
            <div className="flex items-stretch overflow-hidden rounded-md border border-line-2 bg-surface focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-transparent px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 text-ink-3 hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "close" : "user"} size={16} />
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label">Confirm password</span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
            />
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
              <Icon name="close" size={14} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="md" disabled={loading} block>
            {loading ? "Resetting password…" : "Reset password"}
          </Button>
        </form>

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
