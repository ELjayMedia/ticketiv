import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"

export const metadata = { title: "Privacy policy" }

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Information we collect",
    body: [
      "Account details you provide — your name, email address, phone number and the display handle you choose.",
      "Activity needed to deliver the service — events you book, tickets you hold, transfers, waitlist requests and orders.",
      "Technical data such as device and log information used to keep the service secure and reliable.",
    ],
  },
  {
    heading: "2. How we use your information",
    body: [
      "To process ticket purchases, transfers, refunds and entry at events.",
      "To send service messages and the reminders and notifications you have opted into.",
      "To prevent fraud, secure your account and meet our legal obligations.",
    ],
  },
  {
    heading: "3. Sharing",
    body: [
      "Event organisers receive the attendee information required to admit you and run their event.",
      "Payment and infrastructure providers process data on our behalf under contract.",
      "We do not sell your personal information.",
    ],
  },
  {
    heading: "4. Your choices",
    body: [
      "Manage notification and reminder preferences in Account settings.",
      "Update or correct your profile details at any time.",
      "Request access to or deletion of your data by contacting support.",
    ],
  },
  {
    heading: "5. Security & retention",
    body: [
      "Access to personal data is restricted and protected with row-level security. Sensitive payment details are tokenised and never exposed to your browser.",
      "We keep information only as long as needed to provide the service and meet legal and accounting requirements.",
    ],
  },
  {
    heading: "6. Contact",
    body: ["Questions about this policy? Email privacy@ticketiv.app."],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Legal</span>
        <h1 className="text-h1">Privacy policy</h1>
        <p className="text-[13px] text-ink-3">
          How Ticketiv collects, uses and protects your information.
        </p>
      </header>

      <Card className="flex flex-col gap-5 p-5">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-h3">{section.heading}</h2>
            {section.body.map((para) => (
              <p key={para} className="text-[13px] leading-relaxed text-ink-2">
                {para}
              </p>
            ))}
          </section>
        ))}
      </Card>

      <p className="text-center font-mono text-[11px] text-ink-3">
        Need a hand? Visit the{" "}
        <Link href="/help" className="text-accent hover:underline">
          Help centre
        </Link>
        .
      </p>
    </main>
  )
}
