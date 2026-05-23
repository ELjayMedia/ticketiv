import Link from "next/link"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export default function MaintenancePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardBody className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="settings" size={28} />
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="text-h1">We’ll be right back</h1>
            <p className="text-[14px] text-ink-3">
              Ticketiv is currently undergoing scheduled maintenance to improve your experience.
            </p>
            <p className="inline-flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              <Icon name="clock" size={14} />
              Expected downtime · 2 hours
            </p>
          </div>

          <div className="w-full rounded-[var(--radius-md)] border border-line bg-bg p-4 text-left">
            <p className="text-h3">What’s happening?</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12px] text-ink-3">
              <li>· System upgrades and optimisations</li>
              <li>· Database maintenance</li>
              <li>· Performance improvements</li>
            </ul>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Link
              href="https://twitter.com/ticketiv"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="globe" size={14} />
              Follow for updates
            </Link>
            <Link
              href="mailto:support@ticketiv.com"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-line/60"
            >
              <Icon name="fileText" size={14} />
              Contact support
            </Link>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            Thank you for your patience.
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
