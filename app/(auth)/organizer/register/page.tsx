import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Register as an organizer" }

export default function OrganizerRegisterPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex"><Logo /></Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ticketiv for organizers</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">Verify once, then start building your event.</h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Organizer registration is the only Ticketiv account flow that uses a six-digit email verification code.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">1. Add organizer details</p>
              <p className="mt-1 text-[12px] text-ink-3">First name, surname, phone and email are required. ID number is optional.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">2. Verify the organizer email</p>
              <p className="mt-1 text-[12px] text-ink-3">Enter the latest six-digit code sent to the organizer email.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">3. Create the organization</p>
              <p className="mt-1 text-[12px] text-ink-3">Continue into event setup, payouts and team access.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Organizer registration</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Start hosting on Ticketiv.</h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">We verify organizer email ownership before enabling organizer tools.</p>
          <div className="mt-8"><Suspense fallback={null}><SignInForm mode="organizer" /></Suspense></div>
          <p className="mt-8 font-mono text-[11px] text-ink-3">Avoid requesting several codes in a row to prevent email rate limits.</p>
        </div>
      </section>
    </main>
  )
}
