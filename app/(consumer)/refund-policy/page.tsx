import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"

export const metadata = { title: "Refund policy" }

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Policy hierarchy",
    body: [
      "Each event may publish its own organizer refund window. That event policy applies together with this Ticketiv policy and any legal rights that cannot be excluded.",
      "If an event page says tickets are non-refundable, refunds may still be available for organizer cancellation, qualifying postponement or a verified payment/ticketing error.",
      "Refund terms should be shown before checkout. If a material refund term was not shown clearly, contact support so we can review the transaction.",
    ],
  },
  {
    heading: "2. Organizer cancellation",
    body: [
      "If an organizer cancels an event and does not provide an accepted replacement date, buyers should receive a refund of the ticket face value and any refundable fees.",
      "Ticketiv may need confirmation from the organizer and payment provider before processing the return of funds.",
      "If the organizer has already received settlement funds, the refund may depend on recovery from the organizer or another approved resolution.",
    ],
  },
  {
    heading: "3. Postponement or material event change",
    body: [
      "If an event is postponed, your ticket normally remains valid for the new date unless the organizer announces a refund option.",
      "Where the new date, venue or core event details materially change and you cannot attend, request a refund within the window announced for that change.",
      "If no special window is announced, contact support as soon as possible after the change notice so the organizer can review the request.",
    ],
  },
  {
    heading: "4. Buyer no-show or change of mind",
    body: [
      "If you do not attend an event, arrive too late for entry or change your mind after the refund window closes, the ticket is usually not refundable.",
      "Where transfers or resale are enabled, you may use those tools before the event instead of requesting a refund.",
      "No-show refunds are only available where the organizer policy, a support decision or applicable law requires it.",
    ],
  },
  {
    heading: "5. Failed payment or ticket delivery issue",
    body: [
      "If money was debited but no valid ticket was issued, contact support with the order details and payment reference so we can trace the provider record.",
      "If the provider confirms a failed or reversed payment, the ticket may be cancelled and the funds should return through the payment method or provider process.",
      "If the provider confirms a successful payment but delivery failed, our first remedy is to issue or resend the valid ticket.",
    ],
  },
  {
    heading: "6. How to request a refund",
    body: [
      "Open the ticket or order in Ticketiv and use the refund action where available, or email support@ticketiv.app with the order number, event name and reason.",
      "Refund requests should be made before the event starts unless the issue only becomes known later, such as cancellation, payment error or ticket delivery failure.",
      "Approved refunds are normally returned to the original payment method. Provider and bank timelines may vary.",
    ],
  },
  {
    heading: "7. Abuse and chargebacks",
    body: [
      "Do not use refund, transfer, resale or chargeback processes to obtain duplicate entry or avoid valid event rules.",
      "Ticketiv may suspend accounts or revoke tickets where a transaction appears fraudulent, duplicated or abusive.",
      "If you are considering a chargeback, contact support first so we can investigate and preserve the provider, ledger and ticket records.",
    ],
  },
  {
    heading: "8. Contact",
    body: [
      "Refund questions can be sent to support@ticketiv.app.",
      "This policy is a buyer-facing draft and should be reviewed by local counsel before final production launch.",
    ],
  },
]

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Legal</span>
        <h1 className="text-h1">Refund policy</h1>
        <p className="text-[13px] text-ink-3">
          How refund requests are handled for cancellations, postponements, no-shows and payment issues.
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
        <Link href="/terms" className="text-accent hover:underline">
          Terms and conditions
        </Link>
        .
      </p>
    </main>
  )
}
