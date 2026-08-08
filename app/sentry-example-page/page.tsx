import type { Metadata } from "next"

import { SentryExampleClient } from "./sentry-example-client"

// The verification step from Sentry's Next.js setup guide.
//
// /api/health/sentry?test=1 already proves the *server* DSN end to end, but it
// cannot touch NEXT_PUBLIC_SENTRY_DSN — the browser SDK is a separate transport
// with a separate DSN, and it is entirely possible for one to work while the
// other silently drops everything. This page is the only way to exercise that
// leg, so it earns its place even though the rest of the wizard's output does
// not.
//
// Both buttons raise genuine uncaught errors. Nothing is written, no order or
// ticket state is touched — the server button hits a route that exists only to
// throw.

export const metadata: Metadata = {
  title: "Sentry delivery check",
  robots: { index: false, follow: false },
}

export default function SentryExamplePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Diagnostic</p>
      <h1 className="text-h1 mt-1 text-ink">Sentry delivery check</h1>

      <p className="mt-4 text-ink-2">
        Each button raises a real uncaught error. Nothing is written and no order, ticket or
        payment state is touched. After clicking, open the{" "}
        <span className="font-mono text-[13px]">ticketiv</span> project in Sentry — the issue
        should appear within a few seconds.
      </p>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
        <p className="text-label text-ink-2">
          Browser and server report through different DSNs. Test both: one working does not imply
          the other.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink-3">
          <li>
            <span className="font-mono text-[12px]">NEXT_PUBLIC_SENTRY_DSN</span> — browser errors
          </li>
          <li>
            <span className="font-mono text-[12px]">SENTRY_DSN</span> — server and edge errors
          </li>
        </ul>
      </div>

      <SentryExampleClient />
    </main>
  )
}
