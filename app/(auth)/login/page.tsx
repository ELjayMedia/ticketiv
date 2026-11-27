import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/Logo"
import { authLinkErrorMessage } from "@/lib/auth/auth-link-errors"
import { requestedNext } from "@/lib/auth/redirect"

export const metadata = { title: "Log in to Ticketiv" }

type SearchParams = Record<string, string | string[] | undefined>

function paramGetter(params: SearchParams) {
  return { get: (name: string) => { const v = params[name]; return typeof v === "string" ? v : null } }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = paramGetter(await searchParams)
  const notice = params.get("message") === "password-reset" ? "Password updated. Log in with your new password." : null

  return (
    <main className="page-frame grid min-h-dvh gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-[var(--shadow-card)] lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex"><Logo /></Link>
        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">One Ticketiv account</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">Your tickets and event tools, in one place.</h1>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home"><Logo /></Link>
        </header>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account login</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Welcome back.</h1>
          <p className="mt-3 text-[14px] leading-6 text-ink-3">Enter your email and password.</p>
          <div className="mt-8"><LoginForm next={requestedNext(params)} linkError={authLinkErrorMessage(params.get("error"))} notice={notice} /></div>
        </div>
      </section>
    </main>
  )
}
