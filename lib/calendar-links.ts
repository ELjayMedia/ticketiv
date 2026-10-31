/**
 * "Add to calendar" links for an event, with no server endpoint: a Google
 * Calendar template URL and an inline .ics (data: URI) that Apple Calendar,
 * Outlook and most phones open directly.
 */

export interface CalendarEventInput {
  title: string;
  start: Date;
  /** Defaults to start + 3h when the event end is unknown. */
  end?: Date | null;
  location?: string | null;
  details?: string | null;
  /** Stable id so re-adding updates rather than duplicates. */
  uid: string;
}

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export function calendarLinks(input: CalendarEventInput): { google: string; ics: string } {
  const end = input.end ?? new Date(input.start.getTime() + DEFAULT_DURATION_MS);
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${utcStamp(input.start)}/${utcStamp(end)}`,
    ...(input.location ? { location: input.location } : {}),
    ...(input.details ? { details: input.details } : {}),
  }).toString()}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketiv//Tickets//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@ticketiv.app`,
    `DTSTAMP:${utcStamp(input.start)}`,
    `DTSTART:${utcStamp(input.start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    ...(input.location ? [`LOCATION:${escapeIcs(input.location)}`] : []),
    ...(input.details ? [`DESCRIPTION:${escapeIcs(input.details)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}
