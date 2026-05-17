import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { OtpForm } from "@/components/OtpForm"

export const metadata = { title: "Enter code" }

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>
}) {
  const { to } = await searchParams

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section data-reveal className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
          Step 2 of 2
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Enter the code we sent to your email.
        </h1>
        {to && (
          <p className="mt-2 break-all text-sm text-[var(--color-ink-soft)]">{to}</p>
        )}

        <div className="mt-8">
          <Suspense fallback={null}>
            <OtpForm />
          </Suspense>
        </div>

        <Link
          href="/login"
          className="mt-8 self-start text-sm text-[var(--color-ink-mute)] underline-offset-4 hover:underline"
        >
          ← Use a different email
        </Link>
      </section>
    </main>
  )
}
