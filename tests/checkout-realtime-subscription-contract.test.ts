import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const hookSource = fs.readFileSync(
  path.join(process.cwd(), "lib/hooks/use-event-live-stats.ts"),
  "utf8",
)

describe("checkout live-stats subscription", () => {
  it("resolves public event slugs to the event UUID used by event_live_stats", () => {
    expect(hookSource).toContain("UUID_PATTERN.test(resolvedEventId)")
    expect(hookSource).toContain('.from("events")')
    expect(hookSource).toContain('.eq("slug", resolvedEventId)')
    expect(hookSource).toContain('filter: `event_id=eq.${resolvedEventId}`')
  })

  it("uses a unique realtime topic for every mounted checkout artboard", () => {
    expect(hookSource).toContain("const subscriptionId = useId()")
    expect(hookSource).toContain(
      '.channel(`event-live-stats:${resolvedEventId}:${subscriptionId}`)',
    )
  })

  it("registers postgres callbacks before subscribing and removes the exact channel", () => {
    const onCallback = hookSource.indexOf('.on(\n          "postgres_changes"')
    const subscribe = hookSource.indexOf("channel.subscribe")

    expect(onCallback).toBeGreaterThan(-1)
    expect(subscribe).toBeGreaterThan(onCallback)
    expect(hookSource).toContain("if (channel) void supabase.removeChannel(channel)")
  })
})
