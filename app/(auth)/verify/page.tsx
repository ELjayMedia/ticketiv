import Link from "next/link"
import { Logo } from "@/components/Logo"

export const metadata = { title: "Check your email" }

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
          Email verification
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Check your inbox to continue.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">
          Ticketiv uses Supabase email links. Open the email and click the link to finish signing in.
        </p>
        {to && (
          <p className="mt-3 break-all rounded-[var(--radius-soft)] border bg-card/70 px-3 py-2 text-sm text-[var(--color-ink-soft)]">{to}</p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/sign-in"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Send another login link
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-border bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Create an account instead
          </Link>
        </div>
      </section>
    </main>
  )
}
