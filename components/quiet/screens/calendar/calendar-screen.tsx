"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Segmented } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";

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
  const now = new Date();
  const todayDay = props.today ?? now.getDate();
  const { daysInMonth: curDaysInMonth, firstDayOffset: curFirstDayOffset, monthLabel: curMonthLabel } =
    buildMonthInfo(now.getFullYear(), now.getMonth());
  const cfg = {
    monthLabel: props.monthLabel ?? curMonthLabel,
    eventDays: props.eventDays ?? {},
    today: todayDay,
    daysInMonth: props.daysInMonth ?? curDaysInMonth,
    firstDayOffset: props.firstDayOffset ?? curFirstDayOffset,
    todayLabel: props.todayLabel ?? `Today · ${todayDay} ${MONTH_NAMES[now.getMonth()].slice(0, 3)}`,
    todayEvents: props.todayEvents ?? [],
    comingUp: props.comingUp ?? [],
  };
  const [view, setView] = React.useState<View>("month");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState<string>("all");

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
  // Computed inline (no manual useMemo): the React Compiler memoizes this and
  // the manual memoization tripped react-hooks "could not be preserved".
  const comingUpFiltered: ComingUpEvent[] = (() => {
    let list = selectedDay === null ? cfg.comingUp : (!isInitialMonth ? [] : cfg.comingUp.filter((e) => e.day === selectedDay));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
    }
    return list;
  })();

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
          onClick={() => { setSearchOpen((v) => !v); setSearchQuery(""); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="search" size={20} />
        </button>
        <button
          aria-label="Filter"
          onClick={() => setFilterOpen(true)}
          className={
            "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60 " +
            (filterCategory !== "all" ? "text-accent" : "")
          }
        >
          <Icon name="filter" size={20} />
        </button>
      </header>

      {searchOpen && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2">
            <Icon name="search" size={14} className="text-ink-3 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events…"
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-ink-3 hover:text-ink">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
      )}

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
        <WeekView
          year={displayYear}
          month={displayMonth}
          daysInMonth={daysInMonth}
          today={isInitialMonth ? cfg.today : null}
          todayEvents={isInitialMonth ? cfg.todayEvents : []}
          comingUp={cfg.comingUp}
        />
      )}
      {view === "list" && (
        <ListView
          year={displayYear}
          month={displayMonth}
          today={isInitialMonth ? cfg.today : null}
          todayLabel={cfg.todayLabel}
          todayEvents={isInitialMonth ? cfg.todayEvents : []}
          comingUp={cfg.comingUp}
          searchQuery={searchQuery}
        />
      )}

      {/* Filter bottom sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFilterOpen(false)}
          />
          <div className="relative w-full rounded-t-2xl bg-bg px-5 pb-8 pt-4 shadow-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-2" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-h3">Filter events</span>
              <button onClick={() => setFilterOpen(false)} className="text-ink-3 hover:text-ink">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="text-label mb-3">Category</div>
            <div className="flex flex-wrap gap-2">
              {["all", "music", "comedy", "art", "sport", "food"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={
                    "rounded-full border px-4 py-1.5 text-[13px] font-medium capitalize transition-colors " +
                    (filterCategory === cat
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-ink hover:border-line-2")
                  }
                >
                  {cat === "all" ? "All categories" : cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setFilterCategory("all"); setFilterOpen(false); }}
              className="mt-5 w-full rounded-[var(--radius-md)] border border-line py-2.5 text-[13px] font-medium text-ink-3 hover:bg-surface"
            >
              Clear filter
            </button>
          </div>
        </div>
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

interface WeekViewProps {
  year: number;
  month: number; // 0-indexed
  daysInMonth: number;
  today: number | null;
  todayEvents: CalendarEvent[];
  comingUp: ComingUpEvent[];
}

function WeekView({ year, month, daysInMonth, today, todayEvents, comingUp }: WeekViewProps) {
  // Start the strip on the Monday of the week containing today (or day 1 of the
  // displayed month when today isn't in this month).
  const anchorDay = today ?? 1;
  const anchor = new Date(year, month, anchorDay);
  const weekday = (anchor.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const initialMondayDate = new Date(year, month, anchorDay - weekday);

  const [mondayDate, setMondayDate] = React.useState(initialMondayDate);

  function shiftWeek(delta: number) {
    setMondayDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta * 7);
      return next;
    });
  }

  const days: Array<{
    date: Date;
    inMonth: boolean;
    isToday: boolean;
    events: { id: string; title: string; venue: string; time: string }[];
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const inMonth = d.getMonth() === month && d.getFullYear() === year && d.getDate() <= daysInMonth;
    const isToday = inMonth && today !== null && d.getDate() === today;
    const dayNum = d.getDate();

    let events: { id: string; title: string; venue: string; time: string }[] = [];
    if (inMonth) {
      if (isToday) {
        events = todayEvents.map((e) => ({ id: e.id, title: e.title, venue: e.venue, time: e.time }));
      } else {
        events = comingUp
          .filter((e) => e.day === dayNum)
          .map((e) => ({ id: e.id, title: e.title, venue: e.venue, time: e.time }));
      }
    }
    days.push({ date: d, inMonth, isToday, events });
  }

  const startLabel = mondayDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const endLabel = days[6].date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-3">
        <button
          onClick={() => shiftWeek(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 bg-surface hover:bg-bg"
          aria-label="Previous week"
        >
          <Icon name="chevL" size={14} />
        </button>
        <span className="flex-1 text-center text-[14px] font-semibold">
          {startLabel} – {endLabel}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-line-2 bg-surface hover:bg-bg"
          aria-label="Next week"
        >
          <Icon name="chevR" size={14} />
        </button>
      </div>

      <div className="px-5 pb-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <div
              key={i}
              className={
                "flex flex-col rounded-[var(--radius-md)] border p-1.5 min-h-[110px] " +
                (d.isToday
                  ? "border-transparent bg-accent text-white"
                  : d.inMonth
                  ? "border-line bg-surface"
                  : "border-line/50 bg-bg")
              }
            >
              <span
                className={
                  "text-center font-mono text-[10px] uppercase " +
                  (d.isToday ? "text-white/85" : "text-ink-3")
                }
              >
                {WEEKDAYS[i]}
              </span>
              <span
                className={
                  "text-center font-mono text-[13px] font-semibold " +
                  (d.isToday ? "text-white" : d.inMonth ? "text-ink" : "text-ink-3")
                }
              >
                {d.date.getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {d.events.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className={
                      "truncate rounded-sm px-1 py-0.5 text-[9px] " +
                      (d.isToday
                        ? "bg-white/20 text-white"
                        : "bg-accent-soft text-accent")
                    }
                    title={`${e.title} · ${e.time}`}
                  >
                    {e.time} {e.title}
                  </Link>
                ))}
                {d.events.length > 3 && (
                  <span
                    className={
                      "text-center font-mono text-[9px] " +
                      (d.isToday ? "text-white/85" : "text-ink-3")
                    }
                  >
                    +{d.events.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface ListViewProps {
  year: number;
  month: number;
  today: number | null;
  todayLabel: string;
  todayEvents: CalendarEvent[];
  comingUp: ComingUpEvent[];
  searchQuery: string;
}

function ListView({ year, month, today, todayLabel, todayEvents, comingUp, searchQuery }: ListViewProps) {
  type Row = {
    id: string;
    day: number;
    title: string;
    venue: string;
    time: string;
    eventId: string;
  };

  const q = searchQuery.trim().toLowerCase();
  const all: Row[] = [
    ...(today !== null
      ? todayEvents.map((e) => ({
          id: `today-${e.id}`,
          day: today,
          title: e.title,
          venue: e.venue,
          time: e.time,
          eventId: e.id,
        }))
      : []),
    ...comingUp.map((e) => ({
      id: e.id,
      day: e.day,
      title: e.title,
      venue: e.venue,
      time: e.time,
      eventId: e.id,
    })),
  ]
    .filter((r) =>
      q ? r.title.toLowerCase().includes(q) || r.venue.toLowerCase().includes(q) : true,
    )
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  if (all.length === 0) {
    return (
      <EmptyView label={q ? "No events match your search." : "No events to list."} />
    );
  }

  const grouped = new Map<number, Row[]>();
  for (const r of all) {
    const arr = grouped.get(r.day) ?? [];
    arr.push(r);
    grouped.set(r.day, arr);
  }
  const days = [...grouped.keys()].sort((a, b) => a - b);

  return (
    <div className="px-5">
      {days.map((day) => {
        const date = new Date(year, month, day);
        const isToday = today === day;
        const headerLabel = isToday
          ? todayLabel
          : date.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
        return (
          <section key={day} className="pb-4">
            <div className="text-label mb-2">{headerLabel}</div>
            <ul className="flex flex-col gap-1.5">
              {grouped.get(day)!.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/events/${r.eventId}`}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 transition-colors hover:bg-bg"
                  >
                    <div className="flex w-12 flex-col items-center font-mono">
                      <span className="text-[13px] font-semibold tabular-nums">{r.time}</span>
                    </div>
                    <div className="h-7 w-[3px] rounded-full bg-accent-soft" />
                    <div className="flex flex-1 flex-col">
                      <span className="text-[13px] font-semibold">{r.title}</span>
                      <span className="font-mono text-[11px] text-ink-3">{r.venue}</span>
                    </div>
                    <Icon name="chevR" size={14} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
