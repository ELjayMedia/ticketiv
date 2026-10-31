"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { cn } from "@/lib/cn";
import { PHOTOS } from "@/lib/photos";
import type { DiscoverEvent } from "@/lib/mappers/discover";

/* ──────────────────────────────────────────────────────────────
 * Featured hero · desktop Discover.
 *
 * Full-bleed cover carousel: each featured event's artwork fills
 * the banner, with the venue tag top-right and the title + "Buy
 * tickets" bottom-left. Autoplays (paused on hover / focus and for
 * reduced-motion users), with arrows, dots and ←/→ keys.
 * ────────────────────────────────────────────────────────────── */

const AUTOPLAY_MS = 6000;

export function FeaturedHero({ events }: { events: ReadonlyArray<DiscoverEvent> }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = events.length;

  const go = React.useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  React.useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [index, count, paused, go]);

  if (count === 0) return null;
  const current = events[Math.min(index, count - 1)];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured events"
      className="relative mb-10 h-[clamp(285px,31.5vw,405px)] overflow-hidden rounded-[var(--radius-xl)] bg-ink shadow-[var(--shadow-card)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      {events.map((ev, i) => (
        <div
          key={ev.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${count}: ${ev.title}`}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          { }
          <img
            src={ev.photo || PHOTOS.crowd_smoke}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            className="h-full w-full object-cover"
          />
          {/* Legibility scrim: heavier at the bottom-left where the copy sits. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Venue tag */}
      {current.venue && (
        <div className="absolute right-5 top-5 z-[2] max-w-[40%] truncate rounded-[var(--radius)] bg-black/55 px-4 py-2 text-[15px] font-medium text-white backdrop-blur-sm">
          {current.venue}
        </div>
      )}

      {/* Copy + CTA */}
      <div className="absolute bottom-11 left-20 z-[2] flex max-w-[min(640px,60%)] flex-col items-start gap-3">
        {current.category && (
          <span className="rounded-full bg-white/90 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
            {current.featuredPriority !== null ? "Featured" : "Coming up"} · {current.category}
          </span>
        )}
        <div className="rounded-[var(--radius-md)] bg-black/55 px-4 py-3 backdrop-blur-sm">
          <h2 className="text-[clamp(24px,2.6vw,36px)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
            {current.title}
          </h2>
          <p className="mt-1.5 font-mono text-[12px] uppercase tracking-wider text-white/80">
            {current.whenLabel}
            {current.priceLabel ? ` · ${current.priceLabel}` : ""}
          </p>
        </div>
        <Link
          href={current.href}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-accent px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Buy tickets <Icon name="arrowR" size={14} />
        </Link>
      </div>

      {count > 1 && (
        <>
          <ArrowButton side="left" label="Previous featured event" onClick={() => go(index - 1)} />
          <ArrowButton side="right" label="Next featured event" onClick={() => go(index + 1)} />
          <div className="absolute bottom-5 left-1/2 z-[2] flex -translate-x-1/2 gap-2">
            {events.map((ev, i) => (
              <button
                key={ev.id}
                type="button"
                aria-label={`Show ${ev.title}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ArrowButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-[2] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        side === "left" ? "left-5" : "right-5",
      )}
    >
      <Icon name={side === "left" ? "chevL" : "chevR"} size={22} />
    </button>
  );
}
