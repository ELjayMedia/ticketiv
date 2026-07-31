import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Log in to Ticketiv" }

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">One Ticketiv account</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">
            Your tickets and organizer tools, in one place.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Log in with the email already linked to your account. Ticketiv restores only the attendee, organizer, staff or talent access already assigned to you.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">1. Enter your account email</p>
              <p className="mt-1 text-[12px] text-ink-3">Use the email you registered with or used to receive your tickets.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">2. Verify the login</p>
              <p className="mt-1 text-[12px] text-ink-3">Enter the latest 6-digit code sent to your inbox.</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4">
              <p className="text-[13px] font-semibold text-ink">3. Continue securely</p>
              <p className="mt-1 text-[12px] text-ink-3">Return with the permissions and tools already linked to your account.</p>
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
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Secure login</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Welcome back.
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">
            Use the email linked to your Ticketiv account. Logging in will not create a new account or change your access.
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <SignInForm mode="login" />
            </Suspense>
          </div>

          <p className="mt-8 font-mono text-[11px] text-ink-3">
            Ticketiv uses passwordless email codes. Keep your inbox secure and never share a verification code with anyone.
          </p>
        </div>
      </section>
    </main>
  )
}
