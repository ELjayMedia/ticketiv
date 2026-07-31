import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { OtpForm } from "@/components/OtpForm"

export const metadata = { title: "Verify email" }

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; mode?: string; intent?: string }>
}) {
  const { to, mode, intent } = await searchParams
  const isOrganizerSignup = mode === "signup" && intent === "organizer"

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
          {isOrganizerSignup ? "Organizer email verification" : "Secure login"}
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          {isOrganizerSignup
            ? "Verify the email for your organizer account."
            : "Enter the code we sent to your email."}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-ink-3">
          {isOrganizerSignup
            ? "Organizer access is only enabled after the email address has been verified."
            : "This code confirms it is you and creates a secure Ticketiv session."}
        </p>
        {to && (
          <p className="mt-2 break-all font-mono text-[12px] text-ink-3">{to}</p>
        )}

        <div className="mt-8">
          <Suspense fallback={null}>
            <OtpForm />
          </Suspense>
        </div>

        <Link
          href={isOrganizerSignup ? "/signup" : "/login"}
          className="mt-8 self-start text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          ← {isOrganizerSignup ? "Change registration details" : "Use a different email"}
        </Link>
      </section>
    </main>
  )
}
