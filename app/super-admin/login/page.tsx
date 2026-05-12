import Link from "next/link"
import { Suspense } from "react"

import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Super Admin Login" }

export default function SuperAdminLoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-3xl border bg-card/80 p-10 shadow-sm backdrop-blur lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Internal access</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Ticketiv super admin.</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            Sign in with the approved admin account. Access is checked against the platform admin allowlist before the dashboard opens.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Super admin login</p>
          <h1 className="mt-3 text-[2.35rem] font-bold leading-[1.05] tracking-tight">Access the control room.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
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
