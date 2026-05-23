"use client"

export interface ScannerManifestItem {
  ticket_code: string
  order_item_id: string
  ticket_type_id: string
  status: "issued" | "transferred" | "checked_in" | "revoked" | "refunded"
  already_checked_in: boolean
}

export interface ScannerManifest {
  eventId: string
  fetchedAt: string
  items: ScannerManifestItem[]
}

const manifestKey = (eventId: string) => `ticketiv_scanner_manifest:${eventId}`
const usedKey = (eventId: string) => `ticketiv_scanner_local_used:${eventId}`

export function loadManifest(eventId: string): ScannerManifest | null {
  if (typeof window === "undefined" || !eventId) return null
  try {
    const raw = window.localStorage.getItem(manifestKey(eventId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScannerManifest
    if (!parsed.items || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

export function persistManifest(manifest: ScannerManifest) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(manifestKey(manifest.eventId), JSON.stringify(manifest))
}

export function clearManifest(eventId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(manifestKey(eventId))
  window.localStorage.removeItem(usedKey(eventId))
}

export function findInManifest(
  manifest: ScannerManifest | null,
  ticketCode: string,
): ScannerManifestItem | null {
  if (!manifest) return null
  return manifest.items.find((item) => item.ticket_code === ticketCode) ?? null
}

function loadUsed(eventId: string): Set<string> {
  if (typeof window === "undefined" || !eventId) return new Set()
  try {
    const raw = window.localStorage.getItem(usedKey(eventId))
    if (!raw) return new Set()
    const list = JSON.parse(raw) as string[]
    return new Set(list)
  } catch {
    return new Set()
  }
}

function persistUsed(eventId: string, used: Set<string>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(usedKey(eventId), JSON.stringify(Array.from(used)))
}

export function isLocallyUsed(eventId: string, ticketCode: string): boolean {
  return loadUsed(eventId).has(ticketCode)
}

export function markLocallyUsed(eventId: string, ticketCode: string) {
  const used = loadUsed(eventId)
  used.add(ticketCode)
  persistUsed(eventId, used)
}

export async function refreshManifest(eventId: string): Promise<ScannerManifest | null> {
  if (!eventId) return null
  try {
    const response = await fetch(`/api/scanner/manifest?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
    })
    if (!response.ok) return null
    const data = (await response.json()) as ScannerManifest
    persistManifest(data)
    // Seed the locally-used set from the server's truth so reloads stay consistent.
    const serverUsed = new Set(
      data.items.filter((item) => item.already_checked_in).map((item) => item.ticket_code),
    )
    const localUsed = loadUsed(eventId)
    serverUsed.forEach((code) => localUsed.add(code))
    persistUsed(eventId, localUsed)
    return data
  } catch (error) {
    console.warn("[scanner] manifest refresh failed", error)
    return null
  }
}
