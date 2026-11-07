// Shape MyCalendarMonth → CalendarScreen props.

import { PHOTOS } from "@/lib/photos"
import { DEFAULT_EVENT_TIME_ZONE, zonedParts } from "@ticketiv/shared"
import type { MyCalendarMonth } from "@/lib/data/attendee/calendar"

export interface CalendarEventProp {
  id: string
  title: string
  venue: string
  time: string
  photo: string
}

export interface ComingUpEventProp {
  id: string
  day: number
  weekday: string
  title: string
  venue: string
  time: string
}

export interface CalendarProps {
  monthLabel: string
  eventDays: Record<number, number>
  today: number
  daysInMonth: number
  firstDayOffset: number
  todayLabel: string
  todayEvents: CalendarEventProp[]
  comingUp: ComingUpEventProp[]
}

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: DEFAULT_EVENT_TIME_ZONE, month: "long", year: "numeric" })
const DAY_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: DEFAULT_EVENT_TIME_ZONE, day: "numeric", month: "short" })
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: DEFAULT_EVENT_TIME_ZONE, weekday: "short" })
const TIME_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: DEFAULT_EVENT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function photoFor(url: string | null, fallbackSeed: number): string {
  if (url) return url
  const pool = [PHOTOS.dj_set, PHOTOS.singer_red, PHOTOS.crowd_lights, PHOTOS.fest_river, PHOTOS.theatre_curtain]
  return pool[fallbackSeed % pool.length]
}

export function mapCalendar(month: MyCalendarMonth): CalendarProps {
  const monthDate = new Date(Date.UTC(month.year, month.month - 1, 1))
  const daysInMonth = new Date(month.year, month.month, 0).getDate()
  const today = new Date()
  // Calendar days are the event's (Eswatini) days, not UTC or the server's.
  const todayParts = zonedParts(today, DEFAULT_EVENT_TIME_ZONE)
  const isCurrentMonth = todayParts.year === month.year && todayParts.month === month.month
  const todayDay = isCurrentMonth ? todayParts.day : 1

  // Mon=0 ... Sun=6 (design uses ISO-ish week starting Monday)
  const firstOfMonth = new Date(Date.UTC(month.year, month.month - 1, 1))
  const isoWeekday = (firstOfMonth.getUTCDay() + 6) % 7

  const eventDays: Record<number, number> = {}
  const todayEvents: CalendarEventProp[] = []
  const comingUp: ComingUpEventProp[] = []
  let seed = 0

  for (const ev of month.events) {
    const d = new Date(ev.starts_at)
    const day = zonedParts(d, DEFAULT_EVENT_TIME_ZONE).day
    eventDays[day] = (eventDays[day] ?? 0) + 1

    if (isCurrentMonth && day === todayDay) {
      todayEvents.push({
        id: ev.event_id,
        title: ev.title,
        venue: ev.venue ?? "TBA",
        time: TIME_FMT.format(d),
        photo: photoFor(ev.cover_image_url, seed++),
      })
    } else if (day > todayDay) {
      comingUp.push({
        id: ev.event_id,
        day,
        weekday: WEEKDAY_FMT.format(d),
        title: ev.title,
        venue: ev.venue ?? "TBA",
        time: TIME_FMT.format(d),
      })
    }
  }

  return {
    monthLabel: MONTH_FMT.format(monthDate),
    eventDays,
    today: todayDay,
    daysInMonth,
    firstDayOffset: isoWeekday,
    todayLabel: isCurrentMonth ? `Today · ${DAY_FMT.format(today)}` : MONTH_FMT.format(monthDate),
    todayEvents,
    comingUp,
  }
}
