"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Segmented } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { PHOTOS } from "@/lib/photos";

/* ──────────────────────────────────────────────────────────────
 * /calendar · port of QuietCalendar
 *
 * Month grid with event-count dots per day. Today is highlighted
 * with the accent fill. Below the grid: today's events, then
 * coming-up list grouped by date.
 *
 * Phase 3 wiring will hook this to Supabase via a single query
 * that returns the user's joined events grouped by date (a
 * Postgres function returning `{ date, count, events[] }`).
 * ────────────────────────────────────────────────────────────── */

type View = "month" | "week" | "list";

interface CalendarProps {
  monthLabel?: string;
  /** 1-indexed days that have events, value = count */
  eventDays?: Record<number, number>;
  /** Today's day-of-month, e.g. 22 */
  today?: number;
  /** Total days in the displayed month */
  daysInMonth?: number;
  /** Mon=0, Tue=1, ..., Sun=6 — the weekday of day 1 */
  firstDayOffset?: number;
  todayLabel?: string;
  todayEvents?: CalendarEvent[];
  comingUp?: ComingUpEvent[];
}

interface CalendarEvent {
  id: string;
  title: string;
  venue: string;
  time: string;
  photo: string;
}

interface ComingUpEvent {
  id: string;
  day: number;
  weekday: string; // "Fri"
  title: string;
  venue: string;
  time: string;
}

const DEFAULT_PROPS: Required<CalendarProps> = {
  monthLabel: "July 2026",
  eventDays: { 15: 1, 22: 1, 25: 2, 27: 1, 30: 1 },
  today: 22,
  daysInMonth: 31,
  firstDayOffset: 2, // July 1 2026 is a Wednesday
  todayLabel: "Today · 22 Jul",
  todayEvents: [
    {
      id: "evt-sunset",
      title: "Sunset Set",
      venue: "Riverside Park",
      time: "18:00",
      photo: PHOTOS.fest_river,
    },
  ],
  comingUp: [
    { id: "evt1", day: 25, weekday: "Fri", title: "Open Mic Friday", venue: "Studio X", time: "20:00" },
    { id: "evt2", day: 25, weekday: "Fri", title: "Stand-up · A.Khan", venue: "Comedy Club", time: "21:30" },
    { id: "evt3", day: 27, weekday: "Sun", title: "A Doll's House", venue: "Natarani", time: "19:00" },
    { id: "evt4", day: 30, weekday: "Wed", title: "Tribal Tales", venue: "Cafe Natarani", time: "20:00" },
  ],
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseMonthLabel(label: string): { year: number; month: number } {
  const yearMatch = label.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  const idx = MONTH_NAMES.findIndex((n) => label.startsWith(n));
  return { year, month: idx >= 0 ? idx : new Date().getMonth() };
}

function buildMonthInfo(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawDay = firstDay.getDay(); // 0=Sun
  const firstDayOffset = rawDay === 0 ? 6 : rawDay - 1; // Mon=0..Sun=6
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  return { daysInMonth, firstDayOffset, monthLabel };
}

export function CalendarScreen(props: CalendarProps = {}) {
  const cfg = { ...DEFAULT_PROPS, ...props };
  const [view, setView] = React.useState<View>("month");

  const { year: initYear, month: initMonth } = React.useMemo(
    () => parseMonthLabel(cfg.monthLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [displayYear, setDisplayYear] = React.useState(initYear);
  const [displayMonth, setDisplayMonth] = React.useState(initMonth);
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  const { daysInMonth, firstDayOffset, monthLabel } = React.useMemo(
    () => buildMonthInfo(displayYear, displayMonth),
    [displayYear, displayMonth]
  );

  const isInitialMonth = displayYear === initYear && displayMonth === initMonth;

  function prevMonth() {
    setSelectedDay(null);
    if (displayMonth === 0) { setDisplayYear((y: number) => y - 1); setDisplayMonth(11); }
    else { setDisplayMonth((m: number) => m - 1); }
  }
  function nextMonth() {
    setSelectedDay(null);
    if (displayMonth === 11) { setDisplayYear((y: number) => y + 1); setDisplayMonth(0); }
    else { setDisplayMonth((m: number) => m + 1); }
  }

  // Derive displayed events from selection
  const isShowingToday = selectedDay === null || (isInitialMonth && selectedDay === cfg.today);
  const dayLabel = isShowingToday
    ? cfg.todayLabel
    : new Date(displayYear, displayMonth, selectedDay!).toLocaleDateString("en-US", {
        weekday: "long", month: "short", day: "numeric",
      });
  const dayEvents = isShowingToday ? cfg.todayEvents : [];
  const comingUpFiltered = React.useMemo((): ComingUpEvent[] => {
    if (selectedDay === null) return cfg.comingUp;
    if (!isInitialMonth) return [];
    return cfg.comingUp.filter((e) => e.day === selectedDay);
  }, [selectedDay, isInitialMonth, cfg.comingUp]);

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col">
          <span className="text-label">Calendar</span>
          <span className="text-h1 mt-0.5">{cfg.monthLabel}</span>
        </div>
        <button
          aria-label="Search calendar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="search" size={20} />
        </button>
        <button
          aria-label="Filter"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="filter" size={20} />
        </button>
      </header>

      {/* Segmented */}
      <div className="px-5 pb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
            { value: "list", label: "List" },
          ]}
        />
      </div>

      {view === "month" && (
        <>
          {/* Month nav */}
          <div className="flex items-center gap-2 px-5 pb-3">
            <button
              onClick={prevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 bg-surface hover:bg-bg"
              aria-label="Previous month"
            >
              <Icon name="chevL" size={14} />
            </button>
            <span className="flex-1 text-center text-[14px] font-semibold">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 bg-surface hover:bg-bg"
              aria-label="Next month"
            >
              <Icon name="chevR" size={14} />
            </button>
          </div>

          {/* Grid */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={i}
                  className="py-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`o-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const isToday = isInitialMonth && d === cfg.today;
                const isSelected = d === selectedDay;
                const count = isInitialMonth ? cfg.eventDays[d] : undefined;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                    className={
                      "relative aspect-square rounded-[var(--radius-md)] border " +
                      (isSelected
                        ? "border-accent bg-ink text-white"
                        : isToday
                        ? "border-transparent bg-accent text-white"
                        : count
                        ? "border-[color:var(--color-accent-soft)] bg-surface"
                        : "border-line bg-surface")
                    }
                  >
                    <span
                      className={
                        "font-mono text-[13px] " +
                        (isSelected || isToday
                          ? "font-bold text-white"
                          : count
                          ? "font-medium text-ink"
                          : "font-medium text-ink-3")
                      }
                    >
                      {d}
                    </span>
                    {count && !isSelected && (
                      <span className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5">
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <span
                            key={i}
                            className={"h-1 w-1 rounded-full " + (isToday ? "bg-white" : "bg-accent")}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today / selected day */}
          <section className="px-5 pb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label">{dayLabel}</span>
              <span className="font-mono text-[11px] text-ink-3">
                {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
              </span>
            </div>
            {dayEvents.length > 0 ? dayEvents.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`}>
                <Card
                  className="flex items-center gap-2.5 p-3 transition-colors hover:bg-bg"
                  flat
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)]">
                    <Photo src={e.photo} height={44} />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[13px] font-semibold">{e.title}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {e.time} · {e.venue}
                    </span>
                  </div>
                  <Button variant="accent" size="xs">
                    View
                  </Button>
                </Card>
              </Link>
            )) : selectedDay !== null ? (
              <div className="rounded-[var(--radius)] border border-dashed border-line px-4 py-3 text-center font-mono text-[11px] text-ink-3">
                No events on this day
              </div>
            ) : null}
          </section>

          {/* Coming up */}
          {comingUpFiltered.length > 0 && (
          <section className="px-5 pb-4">
            <div className="text-label mb-2">Coming up</div>
            <ul className="flex flex-col">
              {comingUpFiltered.map((e, i, arr) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className={
                      "flex items-center gap-3 py-2 " +
                      (i < arr.length - 1 ? "border-b border-line" : "")
                    }
                  >
                    <div className="flex w-9 flex-col items-center">
                      <span className="font-mono text-[16px] font-semibold">
                        {e.day}
                      </span>
                      <span className="font-mono text-[9px] uppercase text-ink-3">
                        {e.weekday}
                      </span>
                    </div>
                    <div className="h-7 w-[3px] rounded-full bg-accent-soft" />
                    <div className="flex flex-1 flex-col">
                      <span className="text-[13px] font-semibold">
                        {e.title}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {e.time} · {e.venue}
                      </span>
                    </div>
                    <Icon name="chevR" size={14} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          )}
        </>
      )}

      {view === "week" && (
        <EmptyView label="Week view — Phase 3 wiring lands a 7-day strip here." />
      )}
      {view === "list" && (
        <EmptyView label="List view — chronological feed lands here." />
      )}
    </div>
  );
}

function EmptyView({ label }: { label: string }) {
  return (
    <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center font-mono text-[11px] text-ink-3">
      {label}
    </div>
  );
}
