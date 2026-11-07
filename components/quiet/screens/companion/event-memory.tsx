"use client";

import * as React from "react";
import Link from "next/link";

import { setOrgFollowAction, submitFeedbackAction, type MemoryActionState } from "@/app/(consumer)/tickets/event/[eventId]/actions";
import { Button } from "@/components/quiet/ui/button";
import { Card } from "@/components/quiet/ui/card";
import { Textarea } from "@/components/quiet/ui/form";
import { Icon } from "@/components/quiet/ui/icon";
import { Photo } from "@/components/quiet/ui/primitives";

/**
 * Event memory — the companion after the event: a private rating, the
 * organiser's highlights, following the organiser, and what to go to next.
 * No public reviews, likes or feeds.
 */

export interface EventMemoryProps {
  eventId: string;
  orgId: string | null;
  orgName: string | null;
  attended: boolean;
  myFeedback: { rating: number; comment: string | null } | null;
  highlights: Array<{ id: string; imageUrl: string; caption: string | null }>;
  following: boolean;
  suggestions: Array<{ id: string; slug: string; title: string; whenLabel: string; photo: string | null; reason: string }>;
}

const INITIAL: MemoryActionState = { ok: false, message: null };
const LABELS = ["", "Poor", "Fair", "Good", "Great", "Brilliant"];

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n]}`}
          onClick={() => onChange(n)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill={n <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className={n <= value ? "text-accent" : "text-ink-4"}>
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function EventMemory(props: EventMemoryProps) {
  const [state, action, pending] = React.useActionState(submitFeedbackAction, INITIAL);
  const [rating, setRating] = React.useState(props.myFeedback?.rating ?? 0);
  const [following, setFollowing] = React.useState(props.following);
  const [followMessage, setFollowMessage] = React.useState<string | null>(null);
  const [followPending, startFollow] = React.useTransition();
  const rated = Boolean(props.myFeedback) || state.ok;

  function toggleFollow() {
    if (!props.orgId) return;
    const next = !following;
    setFollowing(next);
    startFollow(async () => {
      const result = await setOrgFollowAction(props.eventId, props.orgId!, next);
      if (!result.ok) setFollowing(!next);
      setFollowMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {props.attended ? (
        <Card className="flex flex-col gap-2 p-3.5">
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold">{rated ? "Your rating" : "How was it?"}</span>
            <span className="font-mono text-[10px] text-ink-3">Only {props.orgName ?? "the organiser"} sees this, without your name.</span>
          </div>
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="eventId" value={props.eventId} />
            <input type="hidden" name="rating" value={rating || ""} />
            <Stars value={rating} onChange={setRating} />
            {rating > 0 ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-label">Anything to add? (optional)</span>
                  <Textarea name="comment" rows={2} maxLength={1000} defaultValue={props.myFeedback?.comment ?? ""} placeholder="What made it, or what would make it better" />
                </label>
                <Button type="submit" variant="primary" size="sm" className="self-start" disabled={pending}>
                  {pending ? "Saving…" : rated ? "Update rating" : "Send rating"}
                </Button>
              </>
            ) : null}
            {state.message ? (
              <p role="status" className={"text-[13px] font-semibold " + (state.ok ? "text-success" : "text-danger")}>
                {state.message}
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}

      {props.highlights.length ? (
        <section className="flex flex-col gap-2.5" aria-labelledby="memory-highlights">
          <div className="flex items-baseline justify-between">
            <h2 id="memory-highlights" className="text-[18px] font-semibold tracking-[-0.01em]">
              Highlights
            </h2>
            <span className="font-mono text-[10px] uppercase text-ink-3">Chosen by {props.orgName ?? "the organiser"}</span>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {props.highlights.map((h) => (
              <li key={h.id}>
                <a href={h.imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[var(--radius-md)]" aria-label={h.caption ?? "Open photo"}>
                  <Photo src={h.imageUrl} alt={h.caption ?? ""} aspectRatio="1" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {props.orgId ? (
        <Card className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-semibold">Hear about their next event</span>
            <span className="font-mono text-[10px] text-ink-3">{followMessage ?? `From ${props.orgName ?? "this organiser"} only.`}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={following}
            aria-label={`Hear about ${props.orgName ?? "this organiser"}'s next event`}
            onClick={toggleFollow}
            disabled={followPending}
            className={"flex h-7 w-12 shrink-0 items-center rounded-full p-[3px] transition-colors " + (following ? "justify-end bg-accent" : "justify-start bg-line-2")}
          >
            <span className="h-[22px] w-[22px] rounded-full bg-surface shadow-[var(--shadow-card)]" />
          </button>
        </Card>
      ) : null}

      {props.suggestions.length ? (
        <section className="flex flex-col gap-2.5" aria-labelledby="memory-next">
          <h2 id="memory-next" className="text-[18px] font-semibold tracking-[-0.01em]">
            Because you went
          </h2>
          <ul className="flex flex-col gap-2">
            {props.suggestions.map((s) => (
              <li key={s.id}>
                <Link href={`/events/${s.slug}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-2.5 hover:border-line-2">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                    <Photo src={s.photo ?? ""} height={56} />
                  </div>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{s.title}</span>
                    <span className="font-mono text-[10px] uppercase text-ink-3">{s.whenLabel}</span>
                    <span className="font-mono text-[10px] text-accent">{s.reason}</span>
                  </span>
                  <Icon name="chevR" size={14} className="shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
