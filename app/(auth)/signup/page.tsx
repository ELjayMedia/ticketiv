import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { Logo } from "@/components/Logo"
import { requestedNext } from "@/lib/auth/redirect"

export const metadata = { title: "Create a Ticketiv account" }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = requestedNext({ get: (name) => { const v = params[name]; return typeof v === "string" ? v : null } })

  return (
    <main className="page-frame grid min-h-dvh gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex"><Logo /></Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Create your Ticketiv account</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">Keep tickets, purchases and profile details together.</h1>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account sign-up</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Create your account.</h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">Your name, email and a password.</p>
          <div className="mt-8"><SignupForm next={next} /></div>
          <p className="mt-8 font-mono text-[11px] text-ink-3">Organizer registration has its own verified-email journey and remains separate from this account sign-up.</p>
        </div>
      </section>
    </main>
  )
}
