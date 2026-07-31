import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { OtpForm } from "@/components/OtpForm"

export const metadata = { title: "Verify organizer email" }

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; intent?: string }>
}) {
  const { to, intent } = await searchParams

  if (intent !== "organizer") redirect("/login")

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home"><Logo /></Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Organizer email verification</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Verify the email for your organizer registration.</h1>
        <p className="mt-3 text-[13px] leading-5 text-ink-3">
          This six-digit code is used only to confirm organizer email ownership. Normal account sign-up and login use passwords.
        </p>
        {to && <p className="mt-2 break-all font-mono text-[12px] text-ink-3">{to}</p>}

        <div className="mt-8"><Suspense fallback={null}><OtpForm /></Suspense></div>

        <Link href="/organizer/register" className="mt-8 self-start text-[13px] text-ink-3 underline-offset-4 hover:underline">
          ← Change organizer registration details
        </Link>
      </section>
    </main>
  )
}
