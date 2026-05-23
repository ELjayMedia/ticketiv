import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Welcome back</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">
            Log in to your Ticketiv ID.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-6 text-ink-3">
            Access your tickets, event tools, scanning permissions and talent profiles through the same Supabase Auth UUID.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </header>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Log in</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Let’s get you in.
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">
            Use your email address. Login will not create a new account.
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
