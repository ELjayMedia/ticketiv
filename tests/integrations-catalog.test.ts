import { afterEach, describe, expect, it, vi } from "vitest"

import { envStatus, INTEGRATION_KINDS, INTEGRATIONS, integrationsOfKind, selectorValues } from "@/lib/integrations/catalog"
import { channelStatus } from "@/lib/integrations/status"
import { sendSms, SMS_SENDERS } from "@/lib/notifications/channels/sms"
import { sendWhatsApp, WHATSAPP_SENDERS } from "@/lib/notifications/channels/whatsapp"
import { CHECKOUT_PROVIDERS } from "@/lib/payments/providers/catalog"

afterEach(() => vi.unstubAllEnvs())

const byId = (id: string) => {
  const integration = INTEGRATIONS.find((i) => i.id === id)
  if (!integration) throw new Error(`no integration ${id}`)
  return integration
}

describe("integrations catalog", () => {
  it("has unique ids and a heading for every kind", () => {
    const ids = INTEGRATIONS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    const kinds = new Set(INTEGRATION_KINDS.map((k) => k.kind))
    for (const integration of INTEGRATIONS) expect(kinds.has(integration.kind), integration.id).toBe(true)
  })

  it("lists exactly the checkout payment providers", () => {
    expect(integrationsOfKind("payments").map((i) => i.id)).toEqual(CHECKOUT_PROVIDERS)
  })

  it("has a sender for every SMS and WhatsApp provider it lists, and nothing extra", () => {
    expect(Object.keys(SMS_SENDERS).sort()).toEqual(selectorValues("sms").sort())
    expect(Object.keys(WHATSAPP_SENDERS).sort()).toEqual(selectorValues("whatsapp").sort())
  })

  it("marks one-at-a-time channels as selector-driven", () => {
    for (const { kind, oneAtATime } of INTEGRATION_KINDS) {
      for (const integration of integrationsOfKind(kind)) {
        expect(Boolean(integration.selectedBy), integration.id).toBe(oneAtATime)
      }
    }
  })
})

describe("envStatus and channelStatus", () => {
  it("reports missing setting names and never the values", () => {
    const resend = byId("resend")
    const missing = envStatus(resend, {})
    expect(missing).toEqual({ missing: ["RESEND_API_KEY"], selected: true, configured: false })

    const status = channelStatus(resend, { RESEND_API_KEY: "re_super_secret_value" })
    expect(status.badge).toBe("Active")
    expect(JSON.stringify(status)).not.toContain("re_super_secret_value")
  })

  it("treats blank values as missing and optional settings as not required", () => {
    expect(envStatus(byId("resend"), { RESEND_API_KEY: "   " }).missing).toEqual(["RESEND_API_KEY"])
    expect(envStatus(byId("resend"), { RESEND_API_KEY: "k" }).missing).toEqual([])
  })

  it("only counts the selected provider of a one-at-a-time channel", () => {
    const env = { SMS_PROVIDER: "africastalking", SMS_API_KEY: "k", AT_USERNAME: "u" }
    expect(channelStatus(byId("africastalking"), env).badge).toBe("Active")
    const twilio = channelStatus(byId("twilio"), env)
    expect(twilio.badge).toBe("Not selected")
    expect(twilio.summary).toContain("SMS_PROVIDER=twilio")
    expect(twilio.missing).toEqual([])
    expect(channelStatus(byId("twilio"), { SMS_PROVIDER: "twilio", SMS_API_KEY: "k" })).toMatchObject({
      badge: "Incomplete",
      missing: ["TWILIO_ACCOUNT_SID", "SMS_FROM"],
    })
  })

  it("maps the Twilio WhatsApp entry to the existing WHATSAPP_PROVIDER value", () => {
    expect(byId("twilio_whatsapp").selectedBy).toEqual({ name: "WHATSAPP_PROVIDER", value: "twilio" })
  })
})

describe("channel dispatch", () => {
  it("skips unknown or prototype-named providers instead of calling them", async () => {
    for (const provider of ["nope", "constructor", "toString", "__proto__"]) {
      vi.stubEnv("SMS_PROVIDER", provider)
      vi.stubEnv("SMS_API_KEY", "k")
      vi.stubEnv("WHATSAPP_PROVIDER", provider)
      vi.stubEnv("WHATSAPP_API_KEY", "k")
      await expect(sendSms({ to: "+26876000000", body: "hi" })).resolves.toMatchObject({ status: "skipped" })
      await expect(sendWhatsApp({ to: "+26876000000", body: "hi" })).resolves.toMatchObject({ status: "skipped" })
    }
  })
})
