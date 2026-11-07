import { createVerify, constants as cryptoConstants } from "node:crypto"

import { DELTAPAY_DEV_BASE_URL, DELTAPAY_PROD_BASE_URL, centsToDeltaPayAmount } from "@/lib/payments/deltapay-core"
import type { EpsAccountScheme } from "@/lib/payouts/eps-directory"

/**
 * DeltaPay wallet rail: organizer payouts (and later refunds) sent from the
 * EljayMedia-owned DeltaPay wallet that collects ticket money.
 *
 * Pure helpers only (no fetch, no env), so they are unit-testable.
 *
 * Wallet transfers are signed with the wallet's private key: DeltaPay's
 * recommended "send" endpoints take the key in the HTTPS body, sign in memory
 * and never store it. The key is therefore a server-only secret, read only by
 * the finance payout action, and never logged.
 */

export interface DeltaPayWalletConfig {
  baseUrl: string
  /** Hosted Checkout / account API key: used for lookups (x-api-key). */
  apiKey: string | null
  walletAddress: string | null
  privateKey: string | null
  /** RSA public key DeltaPay returned when the callback URL was registered. */
  callbackPublicKey: string | null
  operational: boolean
  problems: string[]
}

export function evaluateDeltaPayWalletConfig(input: {
  apiKey?: string | null
  baseUrl?: string | null
  walletAddress?: string | null
  privateKey?: string | null
  callbackPublicKey?: string | null
  payoutsEnabled?: string | null
  productionEnabled?: string | null
  deploymentEnv?: string | null
}): DeltaPayWalletConfig {
  const problems: string[] = []
  const deploymentEnv = input.deploymentEnv?.trim() || "development"
  const baseUrl = (input.baseUrl?.trim() || (deploymentEnv === "production" ? DELTAPAY_PROD_BASE_URL : DELTAPAY_DEV_BASE_URL)).replace(/\/$/, "")
  const apiKey = input.apiKey?.trim() || null
  const walletAddress = input.walletAddress?.trim() || null
  const privateKey = input.privateKey?.trim() || null
  const callbackPublicKey = input.callbackPublicKey?.trim().replace(/\\n/g, "\n") || null

  if (input.payoutsEnabled?.trim().toLowerCase() !== "true") {
    problems.push("DELTAPAY_PAYOUTS_ENABLED must be true to send payouts through DeltaPay.")
  }
  if (!apiKey) problems.push("DELTAPAY_API_KEY is not set.")
  if (!walletAddress) problems.push("DELTAPAY_WALLET_ADDRESS is not set.")
  else if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) problems.push("DELTAPAY_WALLET_ADDRESS must be a 0x… wallet address.")
  if (!privateKey) problems.push("DELTAPAY_WALLET_PRIVATE_KEY is not set.")
  if (!callbackPublicKey?.includes("BEGIN PUBLIC KEY")) {
    problems.push("DELTAPAY_CALLBACK_PUBLIC_KEY (PEM from callback registration) is not set.")
  }

  let host = ""
  try {
    const parsed = new URL(baseUrl)
    host = parsed.hostname
    if (parsed.protocol !== "https:") problems.push("DELTAPAY_BASE_URL must use HTTPS.")
  } catch {
    problems.push("DELTAPAY_BASE_URL is invalid.")
  }
  const isDevHost = host === "api.dev.deltacrypt.net"
  const isProdHost = host === "api.prod.deltacrypt.net"
  if (!isDevHost && !isProdHost) problems.push("DELTAPAY_BASE_URL must use an approved DeltaPay API host.")
  const prodAllowed = input.productionEnabled?.trim().toLowerCase() === "true"
  if (deploymentEnv === "production" && !isProdHost) problems.push("Production payouts must use https://api.prod.deltacrypt.net.")
  if (isProdHost && !prodAllowed) problems.push("DeltaPay production payouts require DELTAPAY_PRODUCTION_ENABLED=true.")

  return { baseUrl, apiKey, walletAddress, privateKey, callbackPublicKey, operational: problems.length === 0, problems }
}

/** Our reference on the DeltaPay transaction (returned on callbacks and lookups). */
export function payoutReference(payoutId: string): string {
  return `ticketiv-payout:${payoutId}`
}

export function payoutIdFromReference(reference: unknown): string | null {
  if (typeof reference !== "string") return null
  const match = /^ticketiv-payout:([0-9a-f-]{36})$/i.exec(reference)
  return match ? match[1].toLowerCase() : null
}

export interface EpsWithdrawalInput {
  payoutId: string
  amountCents: number
  agentId: string
  accountNumber: string
  scheme: EpsAccountScheme
  /** Shown to the recipient as the payment reference (EPS note). */
  note: string
}

/** Body for POST /transaction/eps-withdrawal (private key added by the caller). */
export function buildEpsWithdrawal(input: EpsWithdrawalInput) {
  return {
    amount: centsToDeltaPayAmount(input.amountCents),
    instructed_agent_id: input.agentId,
    creditor_account_id: input.accountNumber,
    creditor_account_scheme: input.scheme,
    note: input.note.slice(0, 200),
    metadata: payoutReference(input.payoutId),
  }
}

/** Query for GET /transaction/eps-withdrawal-preview. */
export function buildEpsWithdrawalPreviewQuery(input: EpsWithdrawalInput, walletAddress: string): URLSearchParams {
  return new URLSearchParams({
    sender_wallet_address: walletAddress,
    amount: String(centsToDeltaPayAmount(input.amountCents)),
    instructed_agent_id: input.agentId,
    creditor_account_id: input.accountNumber,
    creditor_account_scheme: input.scheme,
  })
}

export interface PreviewOutcome {
  possible: boolean
  feeCents: number | null
  reason: string | null
}

/** Reads `transaction_possible` (same shape as DeltaPay's transfer preview). */
export function readPreview(payload: unknown): PreviewOutcome {
  const tp = (payload as { transaction_possible?: Record<string, unknown> } | null)?.transaction_possible
  if (!tp || typeof tp !== "object") return { possible: false, feeCents: null, reason: "DeltaPay returned no preview." }
  const feeRaw = (payload as { fee_info?: { fee?: unknown } }).fee_info?.fee ?? tp.fee
  const fee = typeof feeRaw === "number" && Number.isFinite(feeRaw) ? Math.round(feeRaw * 100) : null
  if (tp.possible === true) return { possible: true, feeCents: fee, reason: null }
  const name = typeof tp.error_name === "string" ? tp.error_name : "Transfer not possible"
  const args = Array.isArray(tp.error_arguments) ? tp.error_arguments.map(String).join(", ") : ""
  return { possible: false, feeCents: fee, reason: args ? `${name} (${args})` : name }
}

/** DeltaPay business transaction status → Ticketiv payout status. */
export function payoutStatusForTransaction(status: unknown): "paid" | "failed" | "processing" | null {
  switch (typeof status === "string" ? status.toLowerCase() : "") {
    case "succeeded":
      return "paid"
    case "failed":
    case "reversed":
      return "failed"
    case "pending":
    case "initiated":
    case "approved":
      return "processing"
    default:
      return null
  }
}

/* ── Callback signature verification ────────────────────────────────────────
 * DeltaPay signs `json.dumps(payload_without_signature, sort_keys=True)`
 * (Python defaults: ", " / ": " separators, ASCII-escaped) with RSA-PSS /
 * SHA-256. Re-serialise from the raw body text so numbers keep their exact
 * spelling (Python writes 100.0, JavaScript would write 100).
 */

type RawJson = null | boolean | string | { num: string } | RawJson[] | { obj: [string, RawJson][] }

function parseRawJson(text: string): RawJson {
  let i = 0
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++
  }
  const value = (): RawJson => {
    ws()
    const c = text[i]
    if (c === "{") {
      i++
      const entries: [string, RawJson][] = []
      ws()
      if (text[i] === "}") return i++, { obj: entries }
      for (;;) {
        ws()
        const key = value()
        if (typeof key !== "string") throw new Error("Invalid JSON key")
        ws()
        if (text[i++] !== ":") throw new Error("Expected ':'")
        entries.push([key, value()])
        ws()
        if (text[i] === ",") { i++; continue }
        if (text[i] === "}") { i++; return { obj: entries } }
        throw new Error("Expected ',' or '}'")
      }
    }
    if (c === "[") {
      i++
      const items: RawJson[] = []
      ws()
      if (text[i] === "]") return i++, items
      for (;;) {
        items.push(value())
        ws()
        if (text[i] === ",") { i++; continue }
        if (text[i] === "]") { i++; return items }
        throw new Error("Expected ',' or ']'")
      }
    }
    if (c === '"') {
      const start = i
      i++
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1
      i++
      return JSON.parse(text.slice(start, i)) as string
    }
    if (text.startsWith("true", i)) return (i += 4), true
    if (text.startsWith("false", i)) return (i += 5), false
    if (text.startsWith("null", i)) return (i += 4), null
    const m = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i))
    if (!m) throw new Error("Invalid JSON value")
    i += m[0].length
    return { num: m[0] }
  }
  const out = value()
  ws()
  if (i !== text.length) throw new Error("Trailing data after JSON")
  return out
}

function pyString(s: string): string {
  let out = '"'
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (ch === '"') out += '\\"'
    else if (ch === "\\") out += "\\\\"
    else if (ch === "\n") out += "\\n"
    else if (ch === "\r") out += "\\r"
    else if (ch === "\t") out += "\\t"
    else if (ch === "\b") out += "\\b"
    else if (ch === "\f") out += "\\f"
    else if (code < 0x20 || code > 0x7e) {
      // ensure_ascii: \uXXXX, astral characters as a surrogate pair.
      for (const unit of code > 0xffff ? [Math.floor((code - 0x10000) / 0x400) + 0xd800, ((code - 0x10000) % 0x400) + 0xdc00] : [code]) {
        out += "\\u" + unit.toString(16).padStart(4, "0")
      }
    } else out += ch
  }
  return out + '"'
}

/** Python's repr() of a float (json.dumps uses it): 500.0, 1.5, 1e-05, 1e+16. */
function pyFloat(token: string): string {
  const n = Number(token)
  if (!Number.isFinite(n)) throw new Error("Invalid number")
  if (n === 0) return Object.is(n, -0) ? "-0.0" : "0.0"
  const [mantissa, expPart] = n.toExponential().split("e") // shortest round-trip digits
  const exp = Number(expPart)
  const sign = mantissa.startsWith("-") ? "-" : ""
  const digits = mantissa.replace("-", "").replace(".", "")
  if (exp >= -4 && exp < 16) {
    if (exp >= digits.length - 1) return sign + digits + "0".repeat(exp - digits.length + 1) + ".0"
    if (exp >= 0) return sign + digits.slice(0, exp + 1) + "." + digits.slice(exp + 1)
    return sign + "0." + "0".repeat(-exp - 1) + digits
  }
  const m = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits
  return `${sign}${m}e${exp < 0 ? "-" : "+"}${String(Math.abs(exp)).padStart(2, "0")}`
}

function pyNumber(token: string): string {
  return /[.eE]/.test(token) ? pyFloat(token) : String(BigInt(token))
}

function pyDumps(v: RawJson): string {
  if (v === null) return "null"
  if (v === true) return "true"
  if (v === false) return "false"
  if (typeof v === "string") return pyString(v)
  if (Array.isArray(v)) return "[" + v.map(pyDumps).join(", ") + "]"
  if ("num" in v) return pyNumber(v.num)
  const sorted = [...v.obj].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return "{" + sorted.map(([k, val]) => `${pyString(k)}: ${pyDumps(val)}`).join(", ") + "}"
}

/** The exact bytes DeltaPay signed for a callback body (signature removed). */
export function deltaPaySignedPayload(rawBody: string): { signed: string; signature: string | null } {
  const parsed = parseRawJson(rawBody)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("obj" in parsed)) {
    throw new Error("Callback body must be a JSON object")
  }
  const sig = parsed.obj.find(([k]) => k === "signature")?.[1]
  const rest: RawJson = { obj: parsed.obj.filter(([k]) => k !== "signature") }
  return { signed: pyDumps(rest), signature: typeof sig === "string" ? sig : null }
}

export function verifyDeltaPayCallback(rawBody: string, publicKeyPem: string): boolean {
  let signed: string
  let signature: string | null
  try {
    ;({ signed, signature } = deltaPaySignedPayload(rawBody))
  } catch {
    return false
  }
  if (!signature) return false
  try {
    const verifier = createVerify("sha256")
    verifier.update(Buffer.from(signed, "utf-8"))
    verifier.end()
    return verifier.verify(
      { key: publicKeyPem, padding: cryptoConstants.RSA_PKCS1_PSS_PADDING, saltLength: cryptoConstants.RSA_PSS_SALTLEN_AUTO },
      Buffer.from(signature, "base64"),
    )
  } catch {
    return false
  }
}
