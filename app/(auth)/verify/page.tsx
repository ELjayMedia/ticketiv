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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Step 2 of 2</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          Enter the code we sent to your email.
        </h1>
        {to && (
          <p className="mt-2 break-all font-mono text-[12px] text-ink-3">{to}</p>
        )}

        <div className="mt-8">
          <Suspense fallback={null}>
            <OtpForm />
          </Suspense>
        </div>

        <Link
          href="/login"
          className="mt-8 self-start text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          ← Use a different email
        </Link>
      </section>
    </main>
  )
}
