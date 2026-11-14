"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getFollowingEventsAction, type FollowingEvent, type FollowingFeed } from "@/app/(consumer)/follows/feed-actions";
import { Card } from "@/components/quiet/ui/card";
import { Icon } from "@/components/quiet/ui/icon";
import { Photo } from "@/components/quiet/ui/primitives";
import { PHOTOS } from "@/lib/photos";

/**
 * "From who you follow": upcoming events from organisers and artists the
 * signed-in person follows. Loaded after the cached Discover page renders;
 * renders nothing for visitors and for people who don't follow anyone yet.
 */
export function FollowingEventsRow({ variant, initialFeed }: { variant: "mobile" | "desktop"; /** Tests and previews only. */ initialFeed?: FollowingFeed }) {
  const [state, setState] = useState<{ followsSomeone: boolean; events: FollowingEvent[] } | null>(
    initialFeed?.signedIn ? { followsSomeone: initialFeed.followsSomeone, events: initialFeed.events } : null,
  );

  useEffect(() => {
    if (initialFeed) return;
    let cancelled = false;
    getFollowingEventsAction()
      .then((feed) => {
        if (!cancelled && feed.signedIn) setState({ followsSomeone: feed.followsSomeone, events: feed.events });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialFeed]);

  if (!state || !state.followsSomeone) return null;

  const mobile = variant === "mobile";
  const header = (
    <div className={mobile ? "flex items-end justify-between px-5 pb-3" : "mb-4 flex items-end justify-between"}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className={mobile ? "text-h2 text-[18px]" : "text-h2"}>From who you follow</h2>
          <Icon name="bell" size={mobile ? 14 : 16} className="text-accent" />
        </div>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">Organisers and artists you follow</p>
      </div>
    </div>
  );

  if (state.events.length === 0) {
    return (
      <section className={mobile ? "pb-6" : "mb-8"}>
        {header}
        <div className={mobile ? "px-5" : ""}>
          <Card className="px-4 py-3.5 text-[13px] text-ink-3" flat>
            Nothing announced yet. We&apos;ll tell you as soon as they announce something.
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className={mobile ? "pb-6" : "mb-8"}>
      {header}
      <div className={mobile ? "no-scrollbar flex gap-3 overflow-x-auto px-5" : "no-scrollbar flex gap-4 overflow-x-auto pb-1"}>
        {state.events.map((e) => (
          <Link key={e.slug} href={e.href} className={`group block shrink-0 ${mobile ? "w-[200px]" : "w-[240px]"}`}>
            <Card className="overflow-hidden transition-shadow group-hover:shadow-[var(--shadow-elev)]">
              <Photo src={e.photo || PHOTOS.dj_neon} height={mobile ? 120 : 150} />
              <div className={mobile ? "p-3" : "p-3.5"}>
                <span className="block truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">{e.reason}</span>
                <div className="text-h3 mt-1 truncate">{e.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name="cal" size={12} />
                  <span className="truncate">{e.dateShort}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold">{e.priceLabel}</span>
                  {e.stockLabel ? (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        e.stockType === "sold-out" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                      }`}
                    >
                      {e.stockLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
