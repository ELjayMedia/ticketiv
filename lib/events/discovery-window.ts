import { EVENT_END_GRACE_MS } from "@/lib/events/lifecycle"

export type DiscoveryLifecycle = "current" | "past" | "all"

export function discoveryEventEndCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - EVENT_END_GRACE_MS).toISOString()
}
