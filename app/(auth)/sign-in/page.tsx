import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Sign in" }

export default function SignInPage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section data-reveal className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
          Step 1 of 2
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Let's get you in.
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Use your phone or email — same account either way.
        </p>

        <div className="mt-8">
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>

        <p className="mt-8 text-xs text-[var(--color-ink-mute)]">
          By continuing you agree to our terms of service.
        </p>
      </section>
    </main>
  )
}
