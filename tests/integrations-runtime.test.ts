import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("no database in unit tests")
  },
}))

import { INTEGRATIONS } from "@/lib/integrations/catalog"
import {
  hasRequiredSettings,
  layerIntegrationEnv,
  pickChannelProvider,
  type StoredIntegrationConfig,
} from "@/lib/integrations/runtime"
import { channelStatus } from "@/lib/integrations/status"

const byId = (id: string) => INTEGRATIONS.find((i) => i.id === id)!
const row = (provider: string, patch: Partial<StoredIntegrationConfig> = {}): StoredIntegrationConfig => ({
  provider,
  enabled: true,
  settings: {},
  secretsEncrypted: null,
  secretHints: {},
  updatedBy: null,
  updatedAt: null,
  ...patch,
})

describe("layerIntegrationEnv", () => {
  const env = { RESEND_API_KEY: "re_env", RESEND_FROM: "Env <env@example.test>", UNRELATED: "x" }

  it("uses the environment when nothing is saved", () => {
    const r = layerIntegrationEnv(byId("resend"), null, {}, env)
    expect(r.source).toBe("environment")
    expect(r.env).toEqual({ RESEND_API_KEY: "re_env", RESEND_FROM: "Env <env@example.test>" })
  })

  it("saved values win, blanks fall back to the environment", () => {
    const r = layerIntegrationEnv(byId("resend"), row("resend", { settings: { RESEND_FROM: "" } }), { RESEND_API_KEY: "re_saved" }, env)
    expect(r.source).toBe("console")
    expect(r.env.RESEND_API_KEY).toBe("re_saved")
    expect(r.env.RESEND_FROM).toBe("Env <env@example.test>")
  })

  it("switched off reads as unconfigured even when Coolify has keys", () => {
    const r = layerIntegrationEnv(byId("resend"), row("resend", { enabled: false }), { RESEND_API_KEY: "re_saved" }, env)
    expect(r.source).toBe("off")
    expect(r.env.RESEND_API_KEY).toBeUndefined()
    expect(hasRequiredSettings(r)).toBe(false)
  })

  it("never lets the console set an environment-only safety flag", () => {
    const r = layerIntegrationEnv(
      byId("paystack"),
      row("paystack", { settings: { PAYSTACK_ALLOW_LIVE_MODE: "true" } }),
      {},
      { PAYSTACK_ALLOW_LIVE_MODE: "false" },
    )
    expect(r.env.PAYSTACK_ALLOW_LIVE_MODE).toBe("false")
  })

  it("switch-only providers ignore saved values entirely", () => {
    const r = layerIntegrationEnv(byId("momo"), row("momo", { settings: { MOMO_BASE_URL: "https://evil.example" } }), {}, { MOMO_BASE_URL: "https://env.example" })
    expect(r.env.MOMO_BASE_URL).toBe("https://env.example")
  })

  it("a switched-on SMS card selects its provider", () => {
    const r = layerIntegrationEnv(byId("twilio"), row("twilio"), { SMS_API_KEY: "t" }, { SMS_PROVIDER: "clickatell" })
    expect(r.env.SMS_PROVIDER).toBe("twilio")
  })
})

describe("pickChannelProvider", () => {
  it("prefers a provider switched on in the console over SMS_PROVIDER", () => {
    const rows = new Map([["africastalking", row("africastalking")]])
    expect(pickChannelProvider("sms", rows, { SMS_PROVIDER: "twilio" })?.id).toBe("africastalking")
  })
  it("falls back to the environment selector", () => {
    expect(pickChannelProvider("sms", new Map(), { SMS_PROVIDER: "twilio" })?.id).toBe("twilio")
  })
  it("respects a console switch-off of the env-selected provider", () => {
    const rows = new Map([["twilio", row("twilio", { enabled: false })]])
    expect(pickChannelProvider("sms", rows, { SMS_PROVIDER: "twilio" })).toBeNull()
  })
  it("ignores unknown selector values", () => {
    expect(pickChannelProvider("whatsapp", new Map(), { WHATSAPP_PROVIDER: "constructor" })).toBeNull()
  })
})

describe("channelStatus", () => {
  it("shows a switched-off integration as Off with nothing missing", () => {
    const s = channelStatus(byId("resend"), {}, "off")
    expect(s).toMatchObject({ badge: "Off", switchedOn: false, missing: [] })
  })
  it("says where an active integration's settings come from", () => {
    expect(channelStatus(byId("resend"), { RESEND_API_KEY: "re_x" }, "console").summary).toMatch(/here/)
    expect(channelStatus(byId("resend"), { RESEND_API_KEY: "re_x" }).summary).toMatch(/Coolify/)
  })
})

describe("wiring", () => {
  const read = (p: string) => readFileSync(p, "utf8")
  it("every catalog entry declares how the console may change it, and money keys are switch-only", () => {
    for (const i of INTEGRATIONS) expect(["full", "switch"]).toContain(i.consoleMode)
    for (const id of ["momo", "deltapay", "deltapay_wallet"]) expect(byId(id).consoleMode).toBe("switch")
  })
  it("the settings table is closed to browsers and audited", () => {
    const sql = read("supabase/migrations/20261125120000_admin_integration_configs.sql")
    expect(sql).toMatch(/enable row level security/)
    expect(sql).toMatch(/revoke all on public\.admin_integration_configs from anon, authenticated/)
    expect(sql).toMatch(/app\.record_settings_history\('provider'\)/)
    expect(sql).not.toMatch(/create policy/)
  })
  it("integration actions are owner-gated and never return secrets", () => {
    const actions = read("app/super-admin/integrations/actions.ts")
    expect(actions.match(/adminForAction\("manage_integrations"\)/g)?.length).toBe(2)
    expect(actions).toContain("encryptPayoutDetails(secrets)")
  })
  it("the browser gets the VAPID public key at run time, not from the build", () => {
    expect(read("lib/push/client.ts")).not.toContain("process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    expect(read("lib/push/client.ts")).toContain("/api/push/public-key")
  })
  it("channel adapters read settings through the resolver", () => {
    expect(read("lib/notifications/channels/email.ts")).toContain('resolveIntegration("resend")')
    expect(read("lib/notifications/channels/sms.ts")).toContain('resolveChannel("sms")')
    expect(read("lib/notifications/channels/whatsapp.ts")).toContain('resolveChannel("whatsapp")')
  })
})
