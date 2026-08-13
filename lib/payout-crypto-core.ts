import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

/**
 * Payout bank details are sensitive PII and must be encrypted at rest.
 *
 * Current storage format:
 *   enc:v2:<keyIdB64url>:<ivB64>:<tagB64>:<ciphertextB64>
 *
 * Backward-compatible read formats:
 *   enc:v1:<ivB64>:<tagB64>:<ciphertextB64>
 *   legacy plaintext JSON (read-only compatibility while rows are re-encrypted)
 *
 * Writes are deliberately fail-closed. PAYOUT_ENCRYPTION_KEY and
 * PAYOUT_ENCRYPTION_KEY_ID must both be present; plaintext is never written as
 * a configuration fallback.
 *
 * Rotation keeps old ciphertext readable through PAYOUT_ENCRYPTION_PREVIOUS_KEYS,
 * a JSON object mapping key id -> old secret, for example:
 *   {"2026-08":"old-secret"}
 *
 * Never log any of these env values or decrypted payout details.
 */

const V1_PREFIX = "enc:v1:"
const V2_PREFIX = "enc:v2:"
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/

export type PayoutDetailsStorageKind =
  | "empty"
  | "encrypted-v2"
  | "encrypted-v1"
  | "legacy-plaintext"
  | "unknown-encrypted"

export class PayoutEncryptionConfigurationError extends Error {
  constructor() {
    super("Payout encryption is not configured for secure writes.")
    this.name = "PayoutEncryptionConfigurationError"
  }
}

type KeyEntry = {
  id: string
  key: Buffer
}

function deriveKey(raw: string): Buffer {
  return createHash("sha256").update(raw).digest()
}

function validSecret(raw: string | undefined): raw is string {
  return typeof raw === "string" && raw.length > 0
}

function parsePreviousKeys(): KeyEntry[] {
  const raw = process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new PayoutEncryptionConfigurationError()
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new PayoutEncryptionConfigurationError()
  }

  const entries: KeyEntry[] = []
  for (const [id, secret] of Object.entries(parsed as Record<string, unknown>)) {
    if (!KEY_ID_PATTERN.test(id) || typeof secret !== "string" || secret.length === 0) {
      throw new PayoutEncryptionConfigurationError()
    }
    entries.push({ id, key: deriveKey(secret) })
  }
  return entries
}

function activeKeyForWrite(): KeyEntry {
  const secret = process.env.PAYOUT_ENCRYPTION_KEY
  const id = process.env.PAYOUT_ENCRYPTION_KEY_ID?.trim()

  if (!validSecret(secret) || !id || !KEY_ID_PATTERN.test(id)) {
    throw new PayoutEncryptionConfigurationError()
  }

  return { id, key: deriveKey(secret) }
}

function decryptKeyring(): KeyEntry[] {
  const keys = new Map<string, Buffer>()
  const activeSecret = process.env.PAYOUT_ENCRYPTION_KEY
  const activeId = process.env.PAYOUT_ENCRYPTION_KEY_ID?.trim()

  // An active key without a key id can still decrypt legacy v1 ciphertext,
  // which did not carry a key identifier. It cannot decrypt v2 by id.
  if (validSecret(activeSecret)) {
    const id = activeId && KEY_ID_PATTERN.test(activeId) ? activeId : "__active_v1__"
    keys.set(id, deriveKey(activeSecret))
  }

  for (const previous of parsePreviousKeys()) {
    if (!keys.has(previous.id)) keys.set(previous.id, previous.key)
  }

  return Array.from(keys, ([id, key]) => ({ id, key }))
}

function decryptWithKey(
  key: Buffer,
  ivB64: string,
  tagB64: string,
  ciphertextB64: string,
): Record<string, unknown> | null {
  try {
    const iv = Buffer.from(ivB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const ciphertext = Buffer.from(ciphertextB64, "base64")
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null

    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
    const parsed = JSON.parse(plaintext) as unknown
    return parsed && !Array.isArray(parsed) && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function parseV2KeyId(stored: string): string | null {
  const parts = stored.split(":")
  if (parts.length !== 6) return null
  const encoded = parts[2]
  if (!BASE64URL_PATTERN.test(encoded)) return null

  try {
    const keyId = Buffer.from(encoded, "base64url").toString("utf8")
    if (!KEY_ID_PATTERN.test(keyId)) return null
    return Buffer.from(keyId, "utf8").toString("base64url") === encoded ? keyId : null
  } catch {
    return null
  }
}

export function payoutDetailsStorageKind(stored: string | null | undefined): PayoutDetailsStorageKind {
  if (!stored) return "empty"
  if (stored.startsWith(V2_PREFIX)) return "encrypted-v2"
  if (stored.startsWith(V1_PREFIX)) return "encrypted-v1"
  if (stored.startsWith("enc:")) return "unknown-encrypted"

  try {
    const parsed = JSON.parse(stored) as unknown
    return parsed && !Array.isArray(parsed) && typeof parsed === "object" ? "legacy-plaintext" : "unknown-encrypted"
  } catch {
    return "unknown-encrypted"
  }
}

export function payoutDetailsKeyId(stored: string | null | undefined): string | null {
  if (!stored || payoutDetailsStorageKind(stored) !== "encrypted-v2") return null
  return parseV2KeyId(stored)
}

export function activePayoutEncryptionKeyId(): string {
  const active = activeKeyForWrite()
  const previousKeys = parsePreviousKeys()
  if (previousKeys.some((previous) => previous.id === active.id)) {
    throw new PayoutEncryptionConfigurationError()
  }
  return active.id
}

export function isPayoutEncryptionConfigured(): boolean {
  try {
    activePayoutEncryptionKeyId()
    return true
  } catch {
    return false
  }
}

export function encryptPayoutDetails(details: Record<string, unknown>): string {
  const plaintext = JSON.stringify(details)
  const active = activeKeyForWrite()
  // Validate the full keyring too, so a malformed rotation config cannot pass
  // unnoticed while new rows continue to be written.
  if (parsePreviousKeys().some((previous) => previous.id === active.id)) {
    throw new PayoutEncryptionConfigurationError()
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", active.key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const encodedKeyId = Buffer.from(active.id, "utf8").toString("base64url")

  return `${V2_PREFIX}${encodedKeyId}:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`
}

export function decryptPayoutDetails(stored: string | null | undefined): Record<string, unknown> | null {
  if (!stored) return null

  const kind = payoutDetailsStorageKind(stored)
  if (kind === "legacy-plaintext") {
    try {
      return JSON.parse(stored) as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (kind === "unknown-encrypted") return null

  let keys: KeyEntry[]
  try {
    keys = decryptKeyring()
  } catch {
    return null
  }
  if (keys.length === 0) return null

  if (kind === "encrypted-v2") {
    const keyId = parseV2KeyId(stored)
    if (!keyId) return null
    const [, , , ivB64, tagB64, ciphertextB64] = stored.split(":")

    const entry = keys.find((candidate) => candidate.id === keyId)
    if (!entry) return null
    return decryptWithKey(entry.key, ivB64, tagB64, ciphertextB64)
  }

  const parts = stored.split(":")
  if (parts.length !== 5) return null
  const [, , ivB64, tagB64, ciphertextB64] = parts

  // v1 did not include a key id. During rotation, try the active and retained
  // previous keys without logging which key succeeded or exposing plaintext.
  for (const entry of keys) {
    const decoded = decryptWithKey(entry.key, ivB64, tagB64, ciphertextB64)
    if (decoded) return decoded
  }
  return null
}

/**
 * Masked display label ("••••1234") derived from a stored details value,
 * decrypting if necessary. Returns "••••" when no account number is available.
 */
export function maskedAccountFromStored(stored: string | null | undefined): string {
  const details = decryptPayoutDetails(stored)
  const acct = details?.account_number
  const raw = typeof acct === "string" ? acct : ""
  return raw.length > 4 ? `••••${raw.slice(-4)}` : "••••"
}
