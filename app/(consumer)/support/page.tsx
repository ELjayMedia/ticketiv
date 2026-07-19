import Link from "next/link"

import { SUPPORT_EMAIL, supportMailto } from "@ticketiv/shared"
import { Card } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

export const metadata = { title: "Buyer support" }

const SUPPORT_MAILTO = supportMailto(
  "Ticketiv buyer support",
  "Order number:\nBuyer email:\nEvent:\nWhat happened:"
)

const CASES: {
  icon: IconName
  title: string
  body: string
  asks: string[]
}[] = [
  {
    icon: "wallet",
    title: "Payment debited, no ticket",
    body: "Support checks the order, payment reference, and gateway status before issuing tickets or escalating a refund follow-up.",
    asks: ["Order number", "Buyer email", "Payment reference", "Amount debited"],
  },
  {
    icon: "ticket",
    title: "Ticket email missing",
    body: "Support confirms the buyer email, checks delivery records, and helps recover the tickets from the buyer account.",
    asks: ["Order number", "Buyer email", "Event name"],
  },
  {
    icon: "qr",
    title: "Duplicate scan dispute",
    body: "Gate staff record the scan time and device, then support reviews ticket status before escalating to event operations.",
    asks: ["Ticket code", "Gate or scanner lane", "Arrival time"],
  },
]

const SLA_ITEMS = [
  "Buyer support replies within one business day.",
  "Event-day access issues are triaged first while doors are active.",
  "Refund and payment investigations stay open until the gateway, organiser, or Ticketiv resolves the case.",
]

export default function BuyerSupportPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Support</span>
        <h1 className="text-h1">Buyer support</h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Email {SUPPORT_EMAIL} for help with payments, missing ticket delivery, or entry
          disputes. Include your order number when you have it.
        </p>
      </header>

      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="spark" size={18} />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">{SUPPORT_EMAIL}</span>
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
              One business day SLA
            </span>
          </div>
          <a
            href={SUPPORT_MAILTO}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bg hover:bg-ink-2"
          >
            Email support <Icon name="arrowR" size={14} />
          </a>
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon name="clock" size={16} className="text-ink-3" />
          <h2 className="text-h3">Response promise</h2>
        </div>
        <Card className="p-0">
          {SLA_ITEMS.map((item, i) => (
            <div
              key={item}
              className={"flex items-start gap-3 px-4 py-3 " + (i > 0 ? "border-t border-line" : "")}
            >
              <Icon name="check" size={15} className="mt-0.5 text-success" />
              <p className="text-[13px] leading-relaxed text-ink-2">{item}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon name="fileText" size={16} className="text-ink-3" />
          <h2 className="text-h3">What to send</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {CASES.map((item) => (
            <Card key={item.title} className="flex flex-col gap-3 p-4" flat>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg text-ink-3">
                <Icon name={item.icon} size={17} />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-[14px] font-semibold text-ink">{item.title}</h3>
                <p className="text-[12px] leading-relaxed text-ink-3">{item.body}</p>
              </div>
              <ul className="mt-auto flex flex-col gap-1 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                {item.asks.map((ask) => (
                  <li key={ask}>{ask}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-4" flat>
        <div className="flex items-start gap-3">
          <Icon name="settings" size={17} className="mt-0.5 text-ink-3" />
          <div className="flex flex-col gap-1">
            <h2 className="text-[14px] font-semibold text-ink">Automation note</h2>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Kaya or n8n can be added as first-line triage once support volume warrants it.
              The first automation should collect the required details above, tag the issue
              type, and escalate urgent event-day access cases to a human.
            </p>
          </div>
        </div>
      </Card>

      <p className="text-center font-mono text-[11px] text-ink-3">
        Looking for general FAQs?{" "}
        <Link href="/help" className="text-accent hover:underline">
          Open the help centre
        </Link>
        .
      </p>
    </main>
  )
}
