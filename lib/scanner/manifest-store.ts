"use client"

import {
  checkedInTicketCodesFromManifest,
  findScannerManifestItem,
  mergeScannerManifestDelta,
  type ScannerManifest,
  type ScannerManifestAccess,
  type ScannerManifestItem,
} from "@ticketiv/shared"

export type {
  ScannerManifest,
  ScannerManifestAccess,
  ScannerManifestItem,
} from "@ticketiv/shared"

const manifestKey = (eventId: string) => `ticketiv_scanner_manifest:${eventId}`
const usedKey = (eventId: string) => `ticketiv_scanner_local_used:${eventId}`

function manifestUrl(eventId: string, params?: ScannerManifestAccess & { since?: string }) {
  const search = new URLSearchParams({ eventId })
  if (params?.since) search.set("since", params.since)
  if (params?.deviceId && params?.sessionId) {
    search.set("deviceId", params.deviceId)
    search.set("sessionId", params.sessionId)
  }
  return `/api/scanner/manifest?${search.toString()}`
}

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
  return findScannerManifestItem(manifest, ticketCode)
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

export function mergeManifestDelta(existing: ScannerManifest, delta: ScannerManifest): ScannerManifest {
  const merged = mergeScannerManifestDelta(existing, delta)
  persistManifest(merged)
  const serverUsed = new Set(checkedInTicketCodesFromManifest(delta))
  if (serverUsed.size > 0) {
    const localUsed = loadUsed(existing.eventId)
    serverUsed.forEach((code) => localUsed.add(code))
    persistUsed(existing.eventId, localUsed)
  }
  return merged
}

export async function deltaFetchManifest(
  eventId: string,
  since: string,
  access?: ScannerManifestAccess,
): Promise<ScannerManifest | null> {
  if (!eventId || !since) return null
  try {
    const response = await fetch(manifestUrl(eventId, { ...access, since }), { cache: "no-store" })
    if (!response.ok) return null
    return (await response.json()) as ScannerManifest
  } catch (error) {
    console.warn("[scanner] delta manifest fetch failed", error)
    return null
  }
}

export async function refreshManifest(eventId: string, access?: ScannerManifestAccess): Promise<ScannerManifest | null> {
  if (!eventId) return null
  try {
    const response = await fetch(manifestUrl(eventId, access), {
      cache: "no-store",
    })
    if (!response.ok) return null
    const data = (await response.json()) as ScannerManifest
    persistManifest(data)
    // Seed the locally-used set from the server's truth so reloads stay consistent.
    const serverUsed = new Set(checkedInTicketCodesFromManifest(data))
    const localUsed = loadUsed(eventId)
    serverUsed.forEach((code) => localUsed.add(code))
    persistUsed(eventId, localUsed)
    return data
  } catch (error) {
    console.warn("[scanner] manifest refresh failed", error)
    return null
  }
}
