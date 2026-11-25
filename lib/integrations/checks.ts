import "server-only"

import type { EnvSnapshot } from "@/lib/integrations/catalog"
import { assertPaystackModeAllowed } from "@/lib/payments/paystack-key-mode"
import { assertVapidKeys } from "@/lib/push/server"

// "Test and save" for the Integrations cards: one light, read-only call per
// provider that proves the credentials work, before anything is stored.
// Providers without a safe read-only endpoint get a format check only and say
// so. Never sends a message and never logs a value.

export type IntegrationCheck = { ok: true; message: string } | { ok: false; error: string }

const TIMEOUT_MS = 10_000

const ok = (message: string): IntegrationCheck => ({ ok: true, message })
const bad = (error: string): IntegrationCheck => ({ ok: false, error })

async function probe(url: string, init: RequestInit): Promise<{ status: number; body: string } | { error: string }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) })
    return { status: res.status, body: (await res.text().catch(() => "")).slice(0, 500) }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    return { error: timedOut ? "didn't answer within 10 seconds" : "couldn't be reached" }
  }
}

function basic(user: string, pass: string) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
}

const E164 = /^\+[1-9]\d{6,14}$/

async function twilioAccount(sid: string, token: string, label: string): Promise<IntegrationCheck> {
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) return bad("The Account SID should start with AC followed by 32 letters and numbers.")
  const res = await probe(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, { headers: { Authorization: basic(sid, token) } })
  if ("error" in res) return bad(`Twilio ${res.error}.`)
  if (res.status === 200) return ok(`Twilio accepted the account SID and auth token (${label}).`)
  if (res.status === 401) return bad("Twilio rejected the account SID or auth token.")
  return bad(`Twilio answered ${res.status}.`)
}

/** Check one integration's effective settings (saved values already layered over env). */
export async function checkIntegration(id: string, env: EnvSnapshot): Promise<IntegrationCheck> {
  const v = (name: string) => env[name]?.trim() ?? ""
  switch (id) {
    case "resend": {
      const key = v("RESEND_API_KEY")
      if (!key.startsWith("re_")) return bad("A Resend API key starts with re_.")
      const from = v("RESEND_FROM")
      if (from && !/@[^\s@>]+\.[^\s@>]+>?$/.test(from)) return bad('The from address should look like "Ticketiv <tickets@ticketiv.app>".')
      const res = await probe("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } })
      if ("error" in res) return bad(`Resend ${res.error}.`)
      if (res.status === 200) return ok("Resend accepted the API key.")
      // Sending-only keys can't list domains, which proves the key is real.
      if (res.status === 401 && res.body.includes("restricted_api_key")) return ok("Resend accepted the API key (sending access).")
      return bad(res.status === 401 || res.status === 403 ? "Resend rejected the API key." : `Resend answered ${res.status}.`)
    }
    case "twilio": {
      if (!E164.test(v("SMS_FROM")) && !/^[A-Za-z0-9 ]{2,11}$/.test(v("SMS_FROM"))) {
        return bad("The sender should be a number like +14155550123 or an alphanumeric id of up to 11 characters.")
      }
      return twilioAccount(v("TWILIO_ACCOUNT_SID"), v("SMS_API_KEY"), "SMS")
    }
    case "twilio_whatsapp": {
      if (!E164.test(v("WHATSAPP_FROM"))) return bad("The WhatsApp sender should be a number like +14155238886.")
      return twilioAccount(v("TWILIO_ACCOUNT_SID"), v("WHATSAPP_API_KEY"), "WhatsApp")
    }
    case "africastalking": {
      const username = v("AT_USERNAME")
      const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com"
      const res = await probe(`${host}/version1/user?username=${encodeURIComponent(username)}`, {
        headers: { apiKey: v("SMS_API_KEY"), Accept: "application/json" },
      })
      if ("error" in res) return bad(`Africa's Talking ${res.error}.`)
      if (res.status === 200) return ok("Africa's Talking accepted the username and API key.")
      return bad(res.status === 401 ? "Africa's Talking rejected the username or API key." : `Africa's Talking answered ${res.status}.`)
    }
    case "clickatell":
      return v("SMS_API_KEY").length >= 16 ? ok("Saved. Clickatell has no read-only check, so send a test message to confirm.") : bad("That doesn't look like a Clickatell API key.")
    case "meta_cloud": {
      const phoneId = v("WHATSAPP_PHONE_NUMBER_ID")
      if (!/^\d{6,20}$/.test(phoneId)) return bad("The phone number ID is the long number from WhatsApp Manager › API setup.")
      const version = process.env.WHATSAPP_API_VERSION ?? "v21.0"
      const res = await probe(`https://graph.facebook.com/${version}/${phoneId}?fields=display_phone_number`, {
        headers: { Authorization: `Bearer ${v("WHATSAPP_API_KEY")}` },
      })
      if ("error" in res) return bad(`Meta ${res.error}.`)
      if (res.status === 200) return ok("Meta accepted the access token for that phone number.")
      return bad(res.status === 401 || res.status === 400 ? "Meta rejected the access token or phone number ID." : `Meta answered ${res.status}.`)
    }
    case "360dialog": {
      const base = v("WHATSAPP_360_BASE_URL")
      if (base && !/^https:\/\//.test(base)) return bad("The API address must start with https://.")
      return v("WHATSAPP_API_KEY").length >= 16 ? ok("Saved. 360dialog has no read-only check, so send a test message to confirm.") : bad("That doesn't look like a 360dialog API key.")
    }
    case "web_push": {
      try {
        assertVapidKeys({ publicKey: v("NEXT_PUBLIC_VAPID_PUBLIC_KEY"), privateKey: v("VAPID_PRIVATE_KEY") })
        return ok("The VAPID key pair is valid.")
      } catch {
        return bad("Those aren't a valid VAPID key pair. Generate one with npx web-push generate-vapid-keys.")
      }
    }
    case "paystack": {
      const key = v("PAYSTACK_SECRET_KEY")
      if (!/^sk_(test|live)_/.test(key)) return bad("A Paystack secret key starts with sk_test_ or sk_live_.")
      try {
        assertPaystackModeAllowed(key, process.env.PAYSTACK_ALLOW_LIVE_MODE === "true")
      } catch (error) {
        return bad(error instanceof Error ? error.message : "Live Paystack keys aren't allowed on this deployment.")
      }
      const res = await probe("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${key}` } })
      if ("error" in res) return bad(`Paystack ${res.error}.`)
      if (res.status === 200) return ok(`Paystack accepted the ${key.startsWith("sk_live_") ? "live" : "test"} secret key.`)
      return bad(res.status === 401 ? "Paystack rejected the secret key." : `Paystack answered ${res.status}.`)
    }
    default:
      return bad("This integration can't be set up from the console.")
  }
}
