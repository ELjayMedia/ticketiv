import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"

export const metadata = { title: "Terms and conditions" }

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Using Ticketiv",
    body: [
      "Ticketiv provides event discovery, ticketing, transfer, resale and check-in tools for buyers, organizers and event staff.",
      "You must provide accurate account and contact information, keep your login details secure and only use Ticketiv for lawful event activity.",
      "We may restrict access, cancel suspicious transactions or suspend accounts that abuse the platform, interfere with event operations or put other users at risk.",
    ],
  },
  {
    heading: "2. Tickets and event entry",
    body: [
      "A ticket is a revocable licence to attend the named event, subject to the organizer's venue, age, safety and entry rules.",
      "Your QR code or secure ticket link must be presented at entry. Staff may ask for identification if the organizer requires it.",
      "Ticketiv and the organizer may refuse admission where a ticket is refunded, revoked, transferred away, already checked in, suspected to be fraudulent or used in breach of these terms.",
    ],
  },
  {
    heading: "3. Prices, fees and payment",
    body: [
      "Ticket prices, platform fees, taxes and any delivery or payment charges should be shown before checkout so you can decide before paying.",
      "Payments are processed by our payment providers. Ticketiv does not store full card details in your browser or in our application database.",
      "If a payment is marked pending, your ticket may not be issued until the provider confirms the transaction or the organizer authorizes an alternative resolution.",
    ],
  },
  {
    heading: "4. Transfers and resale",
    body: [
      "You may transfer eligible tickets through Ticketiv before entry, unless the organizer has disabled transfers or the ticket is no longer valid.",
      "Resale may be limited by the organizer, local law, anti-fraud rules or event-specific conditions. Do not sell tickets outside approved Ticketiv flows if doing so misleads a buyer or bypasses safety controls.",
      "After a transfer is accepted, the recipient becomes responsible for the ticket and the previous holder may lose access to the QR code.",
    ],
  },
  {
    heading: "5. Event changes, cancellation and refunds",
    body: [
      "Organizers are responsible for event details, lineup, venue rules and cancellation or postponement decisions. We help communicate updates where we receive them.",
      "Refunds follow the event's published refund policy, the Ticketiv refund policy and any legal rights that cannot be excluded.",
      "If an event is cancelled, postponed or materially changed, we may need organizer confirmation and payment-provider processing time before funds can be returned.",
    ],
  },
  {
    heading: "6. Organizer responsibilities",
    body: [
      "Organizers must publish accurate event information, ticket types, prices, refund rules, venue details and buyer support contacts.",
      "Organizers must have the rights, permits and authority needed to run the event and to sell tickets through Ticketiv.",
      "Organizers are responsible for honoring valid issued tickets, handling event-day operations and providing timely instructions for cancellations, postponements and refunds.",
    ],
  },
  {
    heading: "7. Liability and service availability",
    body: [
      "Ticketiv provides the platform and related support tools. We are not responsible for losses caused by inaccurate organizer information, venue conditions, third-party outages or events outside our reasonable control.",
      "Nothing in these terms limits rights that cannot be limited under applicable law, or liability for fraud, intentional misconduct or other liability that law does not allow us to exclude.",
      "If something goes wrong, contact support promptly so we can investigate payment, ticket delivery or check-in issues with the organizer and provider records.",
    ],
  },
  {
    heading: "8. Contact and changes",
    body: [
      "Questions about these terms can be sent to support@ticketiv.app.",
      "We may update these terms as the product, law or provider requirements change. Material updates should be published before they apply to new purchases.",
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Legal</span>
        <h1 className="text-h1">Terms and conditions</h1>
        <p className="text-[13px] text-ink-3">
          The rules for buying, holding, transferring and using tickets on Ticketiv.
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
        Also read the{" "}
        <Link href="/refund-policy" className="text-accent hover:underline">
          Refund policy
        </Link>
        .
      </p>
    </main>
  )
}
