import Link from "next/link"
import { Suspense } from "react"

import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Super Admin Login" }

export default function SuperAdminLoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Internal access</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">
            Ticketiv super admin.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Sign in with the approved admin account. Access is checked against the platform admin allowlist before the dashboard opens.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Super admin login</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Access the control room.
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">
            Use the approved admin email. Ticketiv will send a secure verification code.
          </p>
          <div className="mt-8">
            <Suspense fallback={null}>
              <SignInForm mode="login" />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  )
}
