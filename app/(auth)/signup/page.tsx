import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Create account" }

export default function SignupPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ticketiv ID</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">
            Create your account in two quick steps.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Start with your email, verify the 6-digit code, then use the same Ticketiv ID for tickets, event access, organiser tools and staff permissions when they are assigned to you.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">1. Enter your email</p>
              <p className="mt-1 text-[12px] text-ink-3">No password is needed for the MVP.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">2. Verify your code</p>
              <p className="mt-1 text-[12px] text-ink-3">Use the latest code sent by Supabase to finish creating your profile.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </header>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Create your account</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Join Ticketiv.
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">
            Enter your email to receive a 6-digit verification code. Your first role is Attendee; more access is unlocked when your account is linked to events, staff or talent records.
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <SignInForm mode="signup" />
            </Suspense>
          </div>

          <p className="mt-8 font-mono text-[11px] text-ink-3">
            By creating an account you agree to Ticketiv’s terms of service. Avoid requesting multiple codes in a row to prevent email rate limits.
          </p>
        </div>
      </section>
    </main>
  )
}
