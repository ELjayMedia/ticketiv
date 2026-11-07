"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buildEventIcs, type CompanionStage, type GuideFacility, type GuideProgrammeItem } from "@ticketiv/shared";

import { Card } from "@/components/quiet/ui/card";
import { Chip } from "@/components/quiet/ui/chip";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Divider, LiveDot, Photo } from "@/components/quiet/ui/primitives";
import { CheckInCelebration } from "@/components/tickets/check-in-celebration";
import { EventSocialStrip } from "@/components/quiet/screens/event-detail/event-social-strip";
import { TicketQrCode } from "@/components/tickets/ticket-qr-code";
import { useTicketCheckIns, type TicketCheckIn } from "@/lib/hooks/use-ticket-check-ins";

/**
 * Event Companion — one screen per event the attendee holds tickets for.
 * The top card changes with the stage (booked → today → in → after); the
 * sections below come from the organiser's guide and official updates.
 * Styling follows My tickets and the ticket view so it reads as one app.
 */

export interface CompanionTicketProp {
  id: string;
  code: string;
  typeName: string | null;
  checkedInAt: string | null;
}

export interface EventCompanionProps {
  eventId: string;
  title: string;
  slug: string;
  photo: string;
  whenLabel: string;
  dateLabel: string;
  venueName: string | null;
  venueLine: string | null;
  directionsHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  orgName: string | null;
  orderNumber: string;
  tickets: CompanionTicketProp[];
  stage: CompanionStage;
  countdown: string | null;
  doorsLabel: string | null;
  checkedInLabel: string | null;
  guide: {
    entrance: string | null;
    gettingThere: string | null;
    parking: string | null;
    ageRule: string | null;
    paymentNote: string | null;
    whatToBring: string | null;
    houseRules: string | null;
    helpContact: string | null;
    programme: GuideProgrammeItem[];
    facilities: GuideFacility[];
  } | null;
  currentProgrammeIndex: number;
  updates: Array<{ id: string; title: string; body: string | null; whenLabel: string; isNew: boolean }>;
  friendsGoing: Array<{ id: string; name: string }>;
  /** Whether this person lets friends see the events they're going to. */
  visibleToFriends: boolean;
  /** After the event: rating, highlights, follow, suggestions (release 3). */
  memory?: React.ReactNode;
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{children}</h2>
      {aside}
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface px-3.5 py-3">
      <span className="text-label">{label}</span>
      <span className={"mt-0.5 block text-[14px] font-semibold " + (mono ? "font-mono" : "")}>{value}</span>
    </div>
  );
}

function Row({ icon, title, detail, href, accent }: { icon: IconName; title: string; detail: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <span
        className={
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
          (accent ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink")
        }
      >
        <Icon name={icon} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold">{title}</span>
        <span className="font-mono text-[11px] leading-relaxed text-ink-3">{detail}</span>
      </span>
      {href ? <Icon name="chevR" size={14} className="shrink-0 text-ink-3" /> : null}
    </>
  );
  return href ? (
    <a href={href} className="flex items-center gap-3 px-3.5 py-3 hover:bg-bg">
      {body}
    </a>
  ) : (
    <div className="flex items-center gap-3 px-3.5 py-3">{body}</div>
  );
}

function UpdateNotice({ update }: { update: EventCompanionProps["updates"][number] }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-warning/25 bg-warning-soft px-3.5 py-3">
      <Icon name="bell" size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{update.title}</span>
        {update.body ? <span className="text-[13px] leading-relaxed text-ink-2">{update.body}</span> : null}
        <span className="font-mono text-[10px] uppercase text-ink-3">{update.whenLabel}</span>
      </div>
    </div>
  );
}

function Programme({ items, current, title }: { items: GuideProgrammeItem[]; current: number; title: string }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="companion-programme">
      <SectionTitle
        aside={
          current >= 0 ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-accent">
              <LiveDot /> Live
            </span>
          ) : null
        }
      >
        <span id="companion-programme">{title}</span>
      </SectionTitle>
      <Card className="px-3.5 py-1">
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <li key={`${item.time}-${item.title}`} className="flex items-baseline gap-3.5 border-b border-line py-2.5 last:border-b-0">
              <span className={"w-11 shrink-0 font-mono text-[12px] font-semibold " + (index === current ? "text-accent" : "text-ink-3")}>
                {item.time}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={"text-[14px] " + (index === current ? "font-bold" : "font-semibold")}>{item.title}</span>
                {item.where ? <span className="text-[12px] text-ink-3">{item.where}</span> : null}
              </span>
              {index === current ? (
                <Chip variant="accent" size="sm">
                  Now
                </Chip>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}

export function EventCompanion(props: EventCompanionProps) {
  const router = useRouter();
  const [celebration, setCelebration] = React.useState<TicketCheckIn | null>(null);
  const { tickets, guide, stage } = props;
  const ticketIds = React.useMemo(() => tickets.map((t) => t.id), [tickets]);

  // The scan is authoritative on the server: when a check-in arrives, show the
  // welcome and reload so the stage moves to "in" from real data.
  useTicketCheckIns({
    ticketIds: stage === "after" ? [] : ticketIds,
    onCheckIn: (checkIn) => {
      setCelebration(checkIn);
      router.refresh();
    },
  });

  const entryTicket = tickets.find((t) => !t.checkedInAt) ?? tickets[0];
  const entryIndex = tickets.indexOf(entryTicket);
  const typeLabel = tickets[0]?.typeName ?? "Ticket";
  const ticketsLabel = tickets.length > 1 ? `${tickets.length} tickets · ${typeLabel}` : typeLabel;
  const latestUpdate = props.updates.find((u) => u.isNew) ?? null;
  const friendsLabel =
    props.friendsGoing.length === 0
      ? null
      : props.friendsGoing.length <= 2
        ? `${props.friendsGoing.map((f) => f.name).join(" and ")} ${props.friendsGoing.length === 1 ? "is" : "are"} going`
        : `${props.friendsGoing[0].name}, ${props.friendsGoing[1].name} and ${props.friendsGoing.length - 2} more are going`;

  function addToCalendar() {
    const ics = buildEventIcs({
      uid: props.eventId,
      title: props.title,
      startsAt: props.startsAt,
      endsAt: props.endsAt,
      location: [props.venueName, props.venueLine].filter(Boolean).join(", ") || null,
      description: `${ticketsLabel} · Order #${props.orderNumber}`,
      url: typeof window !== "undefined" ? `${window.location.origin}/tickets/event/${props.eventId}` : null,
    });
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.title.replace(/[^\w-]+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const gettingThere = guide && (guide.entrance || guide.gettingThere || guide.parking);
  const goodToKnow = guide
    ? [
        ...(guide.ageRule ? [{ label: "Ages", detail: guide.ageRule }] : []),
        ...(guide.paymentNote ? [{ label: "Payment", detail: guide.paymentNote }] : []),
        ...guide.facilities,
      ]
    : [];

  const gettingThereSection = gettingThere || props.directionsHref ? (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Getting there</SectionTitle>
      <Card className="overflow-hidden">
        <div className="flex flex-col divide-y divide-line">
          {props.venueName ? <Row icon="pin" title={props.venueName} detail={props.venueLine ?? "Venue"} /> : null}
          {guide?.entrance ? <Row icon="flag" title="Entrance" detail={guide.entrance} /> : null}
          {guide?.gettingThere ? <Row icon="map" title="Getting there" detail={guide.gettingThere} /> : null}
          {guide?.parking ? <Row icon="info" title="Parking" detail={guide.parking} /> : null}
        </div>
      </Card>
      {props.directionsHref ? (
        <a
          href={props.directionsHref}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-ink px-4 text-[14px] font-semibold text-white hover:bg-ink-2"
        >
          <Icon name="pin" size={15} /> Directions
        </a>
      ) : null}
    </section>
  ) : null;

  const goodToKnowSection = goodToKnow.length ? (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Good to know</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {goodToKnow.map((fact) => (
          <Fact key={fact.label} label={fact.label} value={fact.detail} />
        ))}
      </div>
    </section>
  ) : null;

  const rulesSection =
    guide && (guide.whatToBring || guide.houseRules) ? (
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Before you go</SectionTitle>
        <Card className="flex flex-col gap-3 px-3.5 py-3">
          {guide.whatToBring ? (
            <div>
              <span className="text-label">What to bring</span>
              <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{guide.whatToBring}</p>
            </div>
          ) : null}
          {guide.houseRules ? (
            <div>
              <span className="text-label">House rules</span>
              <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{guide.houseRules}</p>
            </div>
          ) : null}
        </Card>
      </section>
    ) : null;

  const updatesSection = props.updates.length ? (
    <section className="flex flex-col gap-2.5" aria-labelledby="companion-updates">
      <SectionTitle aside={<span className="font-mono text-[10px] uppercase text-ink-3">From {props.orgName ?? "the organiser"}</span>}>
        <span id="companion-updates">Updates</span>
      </SectionTitle>
      <Card className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-line">
          {props.updates.map((update) => (
            <li key={update.id} className="flex flex-col gap-0.5 px-3.5 py-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                {update.isNew ? <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="New" /> : null}
                {update.title}
              </span>
              {update.body ? <span className="text-[13px] leading-relaxed text-ink-2">{update.body}</span> : null}
              <span className="font-mono text-[10px] uppercase text-ink-3">{update.whenLabel}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  ) : null;

  const helpSection = (
    <Link
      href="/support"
      className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-dashed border-line-2 px-3.5 py-3 hover:bg-bg"
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold">{stage === "in" ? "Lost something or need help?" : "Need help?"}</span>
        <span className="font-mono text-[10px] leading-relaxed text-ink-3">
          {guide?.helpContact ? guide.helpContact : `Contact ${props.orgName ?? "the organiser"} through Ticketiv support.`}
        </span>
      </span>
      <Icon name="chevR" size={14} className="text-ink-3" />
    </Link>
  );

  const noGuide =
    !guide || (!gettingThere && !guide.programme.length && !goodToKnow.length && !guide.whatToBring && !guide.houseRules);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-10">
      {celebration ? (
        <CheckInCelebration eventTitle={props.title} checkedInAt={celebration.checkedInAt} onComplete={() => setCelebration(null)} />
      ) : null}

      <header className="flex flex-col gap-1 px-5 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <Link
            href="/tickets"
            aria-label="Back to My tickets"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 hover:bg-line"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <Link
            href={`/events/${props.slug}`}
            className="font-mono text-[11px] uppercase tracking-wider text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            Event page
          </Link>
        </div>
        <span className="text-label">{stage === "after" ? "My tickets · Past" : "My tickets"}</span>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{props.title}</h1>
        <span className="font-mono text-[11px] uppercase text-ink-3">
          {[props.whenLabel, props.venueName].filter(Boolean).join(" · ")}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-5">
        {/* ── Top card: changes with the stage ─────────────────────── */}
        {stage === "booked" ? (
          <Card className="overflow-hidden border-accent">
            <div className="flex items-center gap-1.5 bg-accent-soft px-3.5 py-2">
              <LiveDot />
              <span className="font-mono text-[11px] font-semibold uppercase text-accent">{props.countdown ?? "Coming up"}</span>
              <span className="flex-1" />
              <span className="font-mono text-[10px] text-ink-3">#{props.orderNumber}</span>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                  <Photo src={props.photo} height={56} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[16px] font-semibold tracking-[-0.01em]">{ticketsLabel}</span>
                  <span className="font-mono text-[11px] uppercase text-ink-3">{props.dateLabel}</span>
                  <span className="mt-1 font-mono text-[10px] uppercase text-ink-3">Not checked in</span>
                </div>
              </div>
              <Divider className="my-3" />
              <div className="flex gap-1.5">
                <a
                  href={`/tickets/${tickets[0].id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-medium text-white hover:bg-ink-2"
                >
                  <Icon name="qr" size={14} />
                  {tickets.length > 1 ? `Open ${tickets.length} tickets` : "Show QR"}
                </a>
                <Link
                  href={`/tickets/${(tickets[1] ?? tickets[0]).id}/transfer`}
                  aria-label="Send a ticket to a friend"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                >
                  <Icon name="arrowUR" size={14} />
                </Link>
                <button
                  type="button"
                  aria-label="Add to calendar"
                  onClick={addToCalendar}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                >
                  <Icon name="cal" size={14} />
                </button>
                {props.directionsHref ? (
                  <a
                    href={props.directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Directions"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line-2 hover:bg-bg"
                  >
                    <Icon name="pin" size={14} />
                  </a>
                ) : null}
              </div>
              {tickets.length > 1 ? (
                <Link
                  href={`/tickets/${tickets[1].id}/transfer`}
                  className="mt-3 flex items-center justify-between rounded-[var(--radius)] border border-dashed border-line-2 px-3 py-2 text-left hover:bg-bg"
                >
                  <span className="flex flex-col">
                    <span className="text-[12px] font-semibold">Bringing someone?</span>
                    <span className="font-mono text-[10px] text-ink-3">Send them their ticket so they get their own QR.</span>
                  </span>
                  <Icon name="chevR" size={14} className="text-ink-3" />
                </Link>
              ) : null}
            </div>
          </Card>
        ) : null}

        {stage === "today" ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-[20px] border border-line bg-surface p-3.5 shadow-[var(--shadow-elev)]">
              <div className="flex items-center gap-3.5">
                <TicketQrCode value={entryTicket.code} label={`Ticket QR code for ${props.title}`} size={128} className="shrink-0 rounded-[10px] p-1.5" />
                <div className="flex min-w-0 flex-col gap-2">
                  <Chip variant="accent" size="sm" className="self-start">
                    Valid for entry
                  </Chip>
                  {guide?.entrance ? (
                    <div className="min-w-0">
                      <span className="text-label">Show at</span>
                      <span className="mt-0.5 block text-[14px] font-semibold">{guide.entrance}</span>
                    </div>
                  ) : null}
                  {props.doorsLabel ? (
                    <div className="min-w-0">
                      <span className="text-label">Doors</span>
                      <span className="mt-0.5 block font-mono text-[14px] font-semibold">{props.doorsLabel}</span>
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <span className="text-label">Ticket</span>
                    <span className="mt-0.5 block truncate text-[14px] font-semibold">{entryTicket.typeName ?? "Ticket"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase text-ink-3">
                {entryIndex + 1} of {tickets.length} · #{props.orderNumber}
              </span>
              <a href={`/tickets/${entryTicket.id}`} className="text-[13px] font-semibold text-accent hover:underline">
                Open full screen
              </a>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-ink-3">
              Open your ticket before you join the queue and turn your brightness up. Save it for offline from the full-screen view.
            </p>
          </div>
        ) : null}

        {stage === "in" ? (
          <Card className="overflow-hidden border-success">
            <div className="flex items-center gap-1.5 bg-success-soft px-3.5 py-2">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
              <span className="font-mono text-[11px] font-semibold uppercase text-success">Checked in</span>
              <span className="flex-1" />
              <span className="font-mono text-[10px] uppercase text-ink-3">{props.checkedInLabel}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 px-4 py-5 text-center">
              <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                <Icon name="check" size={24} />
              </span>
              <span className="text-[26px] font-semibold tracking-[-0.02em]">You’re in!</span>
              <span className="text-[14px] text-ink-2">Welcome to {props.title}. Enjoy it.</span>
              <span className="font-mono text-[10px] uppercase text-ink-3">
                {tickets.filter((t) => t.checkedInAt).length} of {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} used · #{props.orderNumber}
              </span>
              {tickets.some((t) => !t.checkedInAt) ? (
                <a href={`/tickets/${entryTicket.id}`} className="mt-1 text-[13px] font-semibold text-accent hover:underline">
                  Show the next ticket
                </a>
              ) : null}
            </div>
          </Card>
        ) : null}

        {stage === "after" ? (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-1.5 bg-surface-2 px-3.5 py-2">
              {tickets.some((t) => t.checkedInAt) ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-success">
                  <Icon name="check" size={12} /> Attended
                </span>
              ) : (
                <span className="font-mono text-[11px] font-semibold uppercase text-ink-3">Event ended</span>
              )}
              <span className="flex-1" />
              <span className="font-mono text-[10px] text-ink-3">#{props.orderNumber}</span>
            </div>
            <div className="flex items-center gap-3 p-3.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                <Photo src={props.photo} height={64} />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[17px] font-semibold tracking-[-0.01em]">{props.title}</span>
                <span className="font-mono text-[11px] uppercase text-ink-3">{[props.dateLabel, props.venueName].filter(Boolean).join(" · ")}</span>
                {props.checkedInLabel ? <span className="font-mono text-[11px] uppercase text-ink-3">In at {props.checkedInLabel}</span> : null}
              </div>
            </div>
          </Card>
        ) : null}

        {/* ── Stage-ordered sections ─────────────────────────────── */}
        {stage !== "after" && latestUpdate && stage !== "booked" ? <UpdateNotice update={latestUpdate} /> : null}

        {stage === "booked" ? (
          <EventSocialStrip
            eventId={props.eventId}
            eventSlug={props.slug}
            eventTitle={props.title}
            variant="card"
            footnote={
              <Link href="/friends/settings" className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-3 hover:text-ink">
                <span>{props.visibleToFriends ? "Your friends can see you’re going." : "Friends can’t see you’re going. Let them?"}</span>
                <span className="text-accent">{props.visibleToFriends ? "Change" : "Turn on"}</span>
              </Link>
            }
          />
        ) : stage !== "after" && friendsLabel ? (
          <Card className="overflow-hidden">
            <Row icon="users" title="My people" detail={friendsLabel} href="/friends" />
          </Card>
        ) : null}

        {stage === "booked" ? (
          <>
            {updatesSection}
            {gettingThereSection}
            <Programme items={guide?.programme ?? []} current={-1} title="Running order" />
            {goodToKnowSection}
            {rulesSection}
          </>
        ) : null}

        {stage === "today" ? (
          <>
            <Programme items={guide?.programme ?? []} current={props.currentProgrammeIndex} title="Today" />
            {gettingThereSection}
            {goodToKnowSection}
            {rulesSection}
            {props.updates.length > 1 ? updatesSection : null}
          </>
        ) : null}

        {stage === "in" ? (
          <>
            <Programme items={guide?.programme ?? []} current={props.currentProgrammeIndex} title="On now" />
            {goodToKnowSection}
            {props.updates.length > 1 ? updatesSection : null}
          </>
        ) : null}

        {stage === "after" ? (
          <>
            {props.memory}
            {updatesSection}
            <div className="flex gap-2">
              <Link
                href="/tickets?tab=past"
                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius)] border border-line-2 bg-surface text-[14px] font-semibold hover:bg-bg"
              >
                Event history
              </Link>
              <Link
                href="/"
                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius)] bg-ink text-[14px] font-semibold text-white hover:bg-ink-2"
              >
                Find your next event
              </Link>
            </div>
          </>
        ) : null}

        {stage !== "after" && noGuide ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line-2 px-4 py-5 text-center">
            <span className="block text-[14px] font-semibold">The event guide is on its way</span>
            <span className="mt-1 block font-mono text-[11px] leading-relaxed text-ink-3">
              {props.orgName ?? "The organiser"} hasn’t added entry times, directions or the running order yet. You’ll see them here.
            </span>
          </div>
        ) : null}

        {stage !== "after" ? helpSection : null}
      </div>
    </div>
  );
}
