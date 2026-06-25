import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

export const metadata = { title: "Help centre" }

interface Faq {
  q: string
  a: string
}

const SECTIONS: { title: string; icon: IconName; faqs: Faq[] }[] = [
  {
    title: "Tickets & entry",
    icon: "ticket",
    faqs: [
      {
        q: "Where are my tickets?",
        a: "Your tickets live under Tickets in your profile. Each ticket shows a QR code that the gate scanner reads on the day of the event.",
      },
      {
        q: "Can I transfer a ticket to a friend?",
        a: "Yes. Open the ticket and choose Transfer. Your friend receives the ticket in their own account once they accept.",
      },
      {
        q: "My event is sold out — can I still get in?",
        a: "Join the waitlist for the event. If tickets are released or returned, we offer them to the queue in order and you get a limited window to buy.",
      },
    ],
  },
  {
    title: "Payments & refunds",
    icon: "wallet",
    faqs: [
      {
        q: "Which payment methods are supported?",
        a: "We support card payments and mobile money. Saved methods can be managed from Profile → Payment methods.",
      },
      {
        q: "How do refunds work?",
        a: "Refunds follow the organiser's policy for each event. When approved, the amount is returned to your original payment method. Track status under Orders.",
      },
    ],
  },
  {
    title: "Account & privacy",
    icon: "user",
    faqs: [
      {
        q: "How do I change my details or password?",
        a: "Go to Account settings to update your name, phone, notification preferences and password.",
      },
      {
        q: "How is my data handled?",
        a: "Read our Privacy policy for how we collect, use and protect your information.",
      },
    ],
  },
]

export default function HelpCentrePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Support</span>
        <h1 className="text-h1">Help centre</h1>
        <p className="text-[13px] text-ink-3">
          Answers to common questions. Still stuck? We&apos;re one message away.
        </p>
      </header>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="spark" size={18} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">Contact support</span>
            <span className="font-mono text-[11px] text-ink-3">We usually reply within a day.</span>
          </div>
          <a
            href="mailto:support@ticketiv.com?subject=Ticketiv%20support"
            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-bg"
          >
            Email us
          </a>
        </div>
      </Card>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name={section.icon} size={16} className="text-ink-3" />
            <h2 className="text-h3">{section.title}</h2>
          </div>
          <Card className="overflow-hidden p-0">
            {section.faqs.map((faq, i) => (
              <details
                key={faq.q}
                className={"group px-4 py-3 " + (i > 0 ? "border-t border-line" : "")}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-ink">
                  {faq.q}
                  <Icon
                    name="chevD"
                    size={16}
                    className="shrink-0 text-ink-3 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{faq.a}</p>
              </details>
            ))}
          </Card>
        </section>
      ))}

      <p className="text-center font-mono text-[11px] text-ink-3">
        See our{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy policy
        </Link>
        .
      </p>
    </main>
  )
}
