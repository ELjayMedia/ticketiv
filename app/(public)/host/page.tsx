"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

interface Feature {
  icon: IconName
  title: string
  description: string
}

interface Benefit {
  label: string
  description: string
}

interface Stat {
  number: string
  label: string
}

export default function HostEventPage() {
  const router = useRouter()

  const features: Feature[] = [
    {
      icon: "qr",
      title: "QR code check-in",
      description: "Instant ticket verification with realtime check-in analytics. Staff can scan at the door with just a phone.",
    },
    {
      icon: "trending",
      title: "Live analytics",
      description: "Watch ticket sales, attendance rates, and revenue in realtime. Make data-driven decisions instantly.",
    },
    {
      icon: "users",
      title: "Staff management",
      description: "Assign permissions to team members. Control who can create events, check-in guests, and view analytics.",
    },
    {
      icon: "wallet",
      title: "Fast payouts",
      description: "Get paid quickly to your bank account. No middlemen, transparent fees, local payment methods.",
    },
    {
      icon: "ticket",
      title: "Mobile optimised",
      description: "Event pages work perfectly on phones. Attendees can buy and access tickets seamlessly.",
    },
    {
      icon: "globe",
      title: "Instant publishing",
      description: "Events go live immediately. Searchable, shareable, and visible to everyone on the platform.",
    },
  ]

  const benefits: Benefit[] = [
    { label: "No setup fees", description: "Start hosting for free" },
    { label: "Multiple ticket types", description: "VIP, general admission, early-bird pricing" },
    { label: "Capacity management", description: "Set limits and track inventory in real time" },
    { label: "Event templates", description: "Reuse event details for recurring events" },
    { label: "Attendee export", description: "Download ticket holder lists as CSV" },
    { label: "Promo codes", description: "Create discount codes for promotions" },
  ]

  const stats: Stat[] = [
    { number: "50K+", label: "Events hosted" },
    { number: "2M+", label: "Tickets sold" },
    { number: "500K+", label: "Active organisers" },
  ]

  const steps: Array<{ number: string; title: string; description: string }> = [
    { number: "1", title: "Create", description: "Set up your event in minutes" },
    { number: "2", title: "Sell", description: "Tickets sell immediately" },
    { number: "3", title: "Manage", description: "Real-time check-in & analytics" },
    { number: "4", title: "Get paid", description: "Fast payout to your account" },
  ]

  return (
    <main className="min-h-dvh">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-soft via-bg to-bg" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <Chip size="sm" variant="accent">
            <Icon name="zap" size={12} />
            All-in-one event platform
          </Chip>

          <h1 className="text-balance text-[40px] font-semibold leading-tight tracking-tight text-ink sm:text-[56px] lg:text-[64px]">
            Host events that sell.
          </h1>

          <p className="max-w-2xl text-[16px] leading-7 text-ink-3 sm:text-[18px]">
            Ticketiv gives you everything you need to sell tickets, manage attendees, and grow your events. No experience needed.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="primary" size="md" onClick={() => router.push("/signup?type=organizer")}>
              Start hosting free
              <Icon name="arrowR" size={14} />
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              Browse events
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
              <p className="font-mono text-[28px] font-semibold tabular-nums text-accent">{stat.number}</p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-bg px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-center gap-2 text-center">
            <h2 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
              Powerful features built for success.
            </h2>
            <p className="text-[14px] text-ink-3">Everything you need to run successful events.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="transition-colors hover:border-line-2">
                <CardBody className="flex flex-col gap-3 p-5">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                    <Icon name={feature.icon} size={22} />
                  </span>
                  <h3 className="text-[16px] font-semibold text-ink">{feature.title}</h3>
                  <p className="text-[13px] leading-relaxed text-ink-3">{feature.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-center gap-2 text-center">
            <h2 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
              Everything included.
            </h2>
            <p className="text-[14px] text-ink-3">No hidden fees. No surprise charges. Simple pricing.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.label}>
                <CardBody className="flex items-start gap-3 p-4">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[14px] font-semibold text-ink">{benefit.label}</h3>
                    <p className="text-[12px] text-ink-3">{benefit.description}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-bg px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 flex flex-col items-center gap-2 text-center">
            <h2 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
              How it works.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-2">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                <Card>
                  <CardBody className="flex flex-col items-center gap-2 p-5 text-center">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink font-mono text-[14px] font-bold text-surface">
                      {step.number}
                    </span>
                    <h3 className="text-[14px] font-semibold text-ink">{step.title}</h3>
                    <p className="text-[12px] text-ink-3">{step.description}</p>
                  </CardBody>
                </Card>
                {i < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ink-4 md:flex">
                    <Icon name="arrowR" size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-[var(--radius-xl)] border border-accent/20 bg-gradient-to-br from-accent-soft/40 to-bg p-8 text-center sm:p-12">
          <h2 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
            Ready to get started?
          </h2>
          <p className="text-[16px] text-ink-3">
            Join thousands of event organisers. Create your first event for free today.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="primary" size="md" onClick={() => router.push("/signup?type=organizer")} className="min-w-[200px]">
              Create your first event
              <Icon name="arrowR" size={14} />
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              Browse examples
            </Link>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            No credit card required. Start for free today.
          </p>
        </div>
      </section>
    </main>
  )
}
