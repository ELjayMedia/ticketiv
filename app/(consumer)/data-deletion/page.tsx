import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export const metadata = { title: "Data deletion" }

const STEPS = [
  "Sign in to Ticketiv with the account you want to delete.",
  "Open Account settings, then Security.",
  "Use Delete account and confirm with DELETE.",
]

export default function DataDeletionPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 lg:px-6 lg:py-14">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Account data</span>
        <h1 className="text-h1">Data deletion</h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Ticketiv lets signed-in users delete their account from account settings. Some transaction records are
          retained without profile/contact details where accounting, tax, fraud prevention, or event-settlement rules
          require retention.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="trash" size={15} />
              </span>
              <h2 className="text-h3">Delete from the app</h2>
            </div>
            <ol className="flex flex-col gap-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-2 font-mono text-[11px] text-ink-3">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div>
              <Link
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold leading-none text-surface transition-colors duration-150 hover:bg-ink-2"
                href="/account/settings"
              >
                <Icon name="settings" size={14} />
                Account settings
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-line text-ink-3">
                <Icon name="fileText" size={15} />
              </span>
              <h2 className="text-h3">Request help</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-3">
              If you cannot sign in, contact support from the email address on the account. Include data deletion in the
              subject so the request can be verified.
            </p>
            <Link
              href="mailto:support@ticketiv.app?subject=Ticketiv%20data%20deletion"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"
            >
              Email support
              <Icon name="arrowR" size={13} />
            </Link>
            <Link href="/privacy" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
              Privacy policy
              <Icon name="arrowR" size={13} />
            </Link>
          </div>
        </Card>
      </section>
    </main>
  )
}
