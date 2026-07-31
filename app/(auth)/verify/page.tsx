import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { OtpForm } from "@/components/OtpForm"

export const metadata = { title: "Verify your email" }

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
          {isOrganizerSignup ? "Organizer email verification" : "Secure account login"}
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          {isOrganizerSignup
            ? "Verify the email for your organizer account."
            : "Verify your email to log in."}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-ink-3">
          {isOrganizerSignup
            ? "Organizer access is only enabled after the email address has been verified."
            : "Enter the latest 6-digit code. Ticketiv will restore the access already linked to this email without creating a new account."}
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
          ← {isOrganizerSignup ? "Change registration details" : "Use a different account email"}
        </Link>
      </section>
    </main>
  )
}
