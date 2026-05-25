"use client"

/**
 * Client-side persistence for the scanner shell.
 *
 * The scanner runs on shared/issued event devices, so the user-facing
 * scanner journey starts from `/scan/setup` (which captures device name +
 * assigned event) and then redirects to `/scan` (which reads what setup
 * persisted). Storing the device ID and the selected event in
 * localStorage lets the device survive page reloads at the gate without
 * a server round-trip.
 *
 * Everything in here is best-effort: in environments without
 * `localStorage` (SSR, blocked storage) the functions return sensible
 * defaults so callers never crash.
 */

const DEVICE_ID_KEY = "ticketiv_scanner_device"
const DEVICE_NAME_KEY = "ticketiv_scanner_device_name"
const SELECTED_EVENT_KEY = "ticketiv_scanner_selected_event"

export interface SelectedScannerEvent {
  id: string
  title: string
  venueName: string | null
  startsAt: string | null
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadDeviceId(): string {
  const storage = safeStorage()
  if (!storage) return "web"
  const existing = storage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const generated = `device-${crypto.randomUUID()}`
  storage.setItem(DEVICE_ID_KEY, generated)
  return generated
}

export function loadDeviceName(): string | null {
  return safeStorage()?.getItem(DEVICE_NAME_KEY) ?? null
}

export function saveDeviceName(name: string): void {
  safeStorage()?.setItem(DEVICE_NAME_KEY, name)
}

export function loadSelectedEvent(): SelectedScannerEvent | null {
  const raw = safeStorage()?.getItem(SELECTED_EVENT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SelectedScannerEvent
  } catch {
    return null
  }
}

export function saveSelectedEvent(event: SelectedScannerEvent): void {
  safeStorage()?.setItem(SELECTED_EVENT_KEY, JSON.stringify(event))
}

export function clearSelectedEvent(): void {
  safeStorage()?.removeItem(SELECTED_EVENT_KEY)
}
