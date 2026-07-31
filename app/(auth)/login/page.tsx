import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Log in to Ticketiv" }

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex"><Logo /></Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">One Ticketiv account</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">Your tickets and event tools, in one place.</h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Log in directly with the email and password linked to your account. No email code is required for normal login.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">1. Enter your credentials</p>
              <p className="mt-1 text-[12px] text-ink-3">Use your Ticketiv email and password.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">2. Continue securely</p>
              <p className="mt-1 text-[12px] text-ink-3">Ticketiv restores the roles and permissions already linked to your account.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account login</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Welcome back.</h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">Enter your email and password. Ticketiv will not send a login OTP.</p>
          <div className="mt-8"><Suspense fallback={null}><SignInForm mode="login" /></Suspense></div>
          <p className="mt-8 font-mono text-[11px] text-ink-3">Email OTP verification is reserved for organizer registration only.</p>
        </div>
      </section>
    </main>
  )
}
