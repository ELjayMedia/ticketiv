import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Delete your Ticketiv account",
  description: "How to delete your Ticketiv account and what happens to retained transaction records.",
}

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account & privacy</span>
        <h1 className="text-h1">Delete your Ticketiv account</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-3">
          Ticketiv provides self-service account deletion from your signed-in account. Your profile and sign-in
          account are deleted; transaction records that must be retained for accounting or dispute handling are
          anonymised rather than kept as an active user profile.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-h2">Delete your account in Ticketiv</h2>
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>Sign in to Ticketiv.</li>
          <li>
            Open <strong>Account settings</strong>, then choose <strong>Security</strong>.
          </li>
          <li>Scroll to <strong>Delete account</strong>.</li>
          <li>Review any blockers shown on screen, type <strong>DELETE</strong>, and confirm deletion.</li>
        </ol>
        <div className="pt-1">
          <Link
            href="/account/settings?tab=security"
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] bg-ink px-4 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            Open account settings
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">When deletion may be blocked</h2>
        <p className="text-[14px] leading-relaxed text-ink-3">
          Ticketiv may temporarily prevent deletion when the account still has an active responsibility that needs
          to be resolved first, such as an upcoming usable ticket or an organisation ownership role. The app shows
          the specific blocker and what must be resolved before deletion can continue.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">What is deleted or retained</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-line bg-bg p-4">
            <h3 className="mb-2 text-[14px] font-semibold text-ink">Deleted</h3>
            <p className="font-mono text-[11px] leading-relaxed text-ink-3">
              Sign-in identity, profile data, notifications, push subscriptions and other account-linked data that
              no longer needs to be retained.
            </p>
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-bg p-4">
            <h3 className="mb-2 text-[14px] font-semibold text-ink">Anonymised / retained where required</h3>
            <p className="font-mono text-[11px] leading-relaxed text-ink-3">
              Paid order, ticket and audit records may remain where required for accounting, reconciliation,
              refunds, disputes or legal obligations, with unnecessary personal contact details removed.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-h2">Can’t access your account?</h2>
        <p className="text-[14px] leading-relaxed text-ink-3">
          If you cannot sign in or complete self-service deletion, contact Ticketiv support from the contact details
          published on ticketiv.app. Support may need to verify that you control the account before processing a
          deletion request.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-ink-3">
          Do not send passwords, payment card details or one-time codes with a deletion request.
        </p>
      </section>
    </main>
  )
}
