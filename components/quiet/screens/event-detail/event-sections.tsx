"use client";

// Shared pieces of the attendee event page (mobile and desktop):
// the organiser badge under the cover, sponsors, and the FAQ that closes the page.

import Link from "next/link";

import { Avatar } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { Card } from "@/components/quiet/ui/card";
import { Chip } from "@/components/quiet/ui/chip";
import { splitSponsors, type PublicSponsor } from "@/lib/sponsors";
import type { MobileEventData } from "./mobile-event";
import type { useFollows } from "./use-follows";

type Follows = ReturnType<typeof useFollows>;

function organizerStats(o: MobileEventData["organizer"]): string {
  const parts = [`@${o.handle}`];
  if (o.eventsHosted > 0) parts.push(`${o.eventsHosted} event${o.eventsHosted === 1 ? "" : "s"} hosted`);
  if (o.rating > 0) parts.push(`★ ${o.rating.toFixed(1)} (${o.reviewCount ?? 0} reviews)`);
  return parts.join(" · ");
}

/** Who is putting the event on, with a follow button. Sits right under the cover. */
export function OrganizerBadge({ event, follows, compact = false }: { event: MobileEventData; follows: Follows; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Card className={compact ? "flex items-center gap-3 p-3" : "flex items-center gap-3 p-4"} flat>
        <Avatar src={event.organizer.photo} size={compact ? 40 : 48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Organised by</span>
          <div className="flex items-center gap-1.5">
            <span className={compact ? "truncate text-[14px] font-semibold" : "truncate text-[15px] font-semibold"}>{event.organizer.name}</span>
            {event.organizer.verified && <Chip variant="accent" size="sm">Verified</Chip>}
          </div>
          <span className="truncate font-mono text-[11px] text-ink-3">{organizerStats(event.organizer)}</span>
        </div>
        {event.organizer.id ? (
          <Button
            variant={follows.organizerFollowed ? "accent" : "default"}
            size={compact ? "xs" : "sm"}
            aria-pressed={follows.organizerFollowed}
            aria-label={`${follows.organizerFollowed ? "Unfollow" : "Follow"} ${event.organizer.name}`}
            disabled={follows.isPending("organizer", event.organizer.id)}
            onClick={() => follows.toggle("organizer", event.organizer.id ?? null, event.organizer.name)}
          >
            {follows.organizerFollowed ? "Following" : compact ? "Follow" : "Follow organiser"}
          </Button>
        ) : null}
      </Card>
      {follows.notice ? <p role="status" className="px-1 text-[12px] text-ink-3">{follows.notice}</p> : null}
    </div>
  );
}

function SponsorMark({ sponsor, size }: { sponsor: PublicSponsor; size: "lg" | "md" }) {
  const box = size === "lg" ? "h-16 w-32" : "h-12 w-24";
  const inner = sponsor.logoUrl ? (
    <img src={sponsor.logoUrl} alt={sponsor.name} className={`${box} object-contain`} loading="lazy" />
  ) : (
    <span className={`${box} inline-flex items-center justify-center px-2 text-center text-[13px] font-semibold text-ink-2`}>{sponsor.name}</span>
  );
  const cls = "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface p-2 transition-colors";
  return sponsor.websiteUrl ? (
    <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer sponsored" className={`${cls} hover:border-line-2`} title={sponsor.name}>
      {inner}
    </a>
  ) : (
    <span className={cls} title={sponsor.name}>
      {inner}
    </span>
  );
}

/** "Presented by" strip for featured sponsors, under the organiser badge. */
export function PresentedBy({ sponsors }: { sponsors: readonly PublicSponsor[] }) {
  const { featured } = splitSponsors(sponsors);
  if (featured.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Presented by</span>
      {featured.map((s) => (
        <SponsorMark key={s.name} sponsor={s} size="md" />
      ))}
    </div>
  );
}

/** All sponsors, featured first and larger. */
export function SponsorsSection({ sponsors, headingClass }: { sponsors: readonly PublicSponsor[]; headingClass: string }) {
  if (sponsors.length === 0) return null;
  const { featured, others } = splitSponsors(sponsors);
  return (
    <section aria-labelledby="event-sponsors">
      <h2 id="event-sponsors" className={headingClass}>Sponsors</h2>
      <div className="mt-3 flex flex-col gap-3">
        {featured.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {featured.map((s) => (
              <SponsorMark key={s.name} sponsor={s} size="lg" />
            ))}
          </div>
        )}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {others.map((s) => (
              <SponsorMark key={s.name} sponsor={s} size="md" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const FAQ_QUESTIONS: Record<string, string> = {
  Doors: "When do doors open?",
  Ages: "Is there an age limit?",
  Parking: "Is there parking?",
  Payment: "How can I pay at the event?",
  Entry: "What do I need to get in?",
  Refund: "Can I get a refund?",
};

/** Questions answered from what the organiser has set, plus where to get help. */
export function FaqSection({ event, headingClass }: { event: MobileEventData; headingClass: string }) {
  const answers = Object.keys(FAQ_QUESTIONS).flatMap((label) => {
    const fact = event.facts.find(([k]) => k === label);
    return fact ? [{ q: FAQ_QUESTIONS[label], a: fact[1] }] : [];
  });
  return (
    <section aria-labelledby="event-faq">
      <h2 id="event-faq" className={headingClass}>FAQs</h2>
      <div className="mt-3 flex flex-col divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
        {answers.map(({ q, a }) => (
          <details key={q} className="group px-4 py-3">
            <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink marker:hidden">
              <span className="flex items-center justify-between gap-3">
                {q}
                <span className="font-mono text-[12px] text-ink-3 group-open:rotate-45 transition-transform">+</span>
              </span>
            </summary>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
        <details className="group px-4 py-3" open={answers.length === 0}>
          <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink marker:hidden">
            <span className="flex items-center justify-between gap-3">
              Something else?
              <span className="font-mono text-[12px] text-ink-3 group-open:rotate-45 transition-transform">+</span>
            </span>
          </summary>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-2">
            <Link href="/refund-policy" className="font-semibold text-accent hover:underline">Refund policy</Link>
            <Link href="/terms" className="font-semibold text-accent hover:underline">Terms</Link>
            <Link href={event.supportUrl ?? "/help"} className="font-semibold text-accent hover:underline">Help centre</Link>
          </p>
        </details>
      </div>
    </section>
  );
}
