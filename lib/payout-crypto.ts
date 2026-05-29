import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

/**
 * Payout bank details are PII and must be encrypted at rest. Storage format:
 *
 *   enc:v1:<ivB64>:<tagB64>:<ciphertextB64>     (AES-256-GCM)
 *
 * The key comes from PAYOUT_ENCRYPTION_KEY (any string; we SHA-256 it to a
 * 32-byte key so operators can use a passphrase or a generated secret). When
 * the env var is absent we fall back to legacy plaintext JSON so local/dev and
 * existing rows keep working — production MUST set PAYOUT_ENCRYPTION_KEY.
 *
 * Decryption is backward compatible: anything without the enc:v1: prefix is
 * treated as the old plaintext JSON blob.
 */

const PREFIX = "enc:v1:"

function getKey(): Buffer | null {
  const raw = process.env.PAYOUT_ENCRYPTION_KEY
  if (!raw) return null
  return createHash("sha256").update(raw).digest() // 32 bytes
}

export function encryptPayoutDetails(details: Record<string, unknown>): string {
  const plaintext = JSON.stringify(details)
  const key = getKey()
  if (!key) {
    // No key configured — store legacy plaintext. Surfaced as a warning so it
    // doesn't pass silently in a misconfigured production environment.
    console.warn("[payout-crypto] PAYOUT_ENCRYPTION_KEY not set — storing payout details unencrypted")
    return plaintext
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`
}

export function decryptPayoutDetails(stored: string | null | undefined): Record<string, unknown> | null {
  if (!stored) return null

  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext JSON blob.
    try {
      return JSON.parse(stored) as Record<string, unknown>
    } catch {
      return null
    }
  }

  const key = getKey()
  if (!key) {
    console.error("[payout-crypto] encrypted payout details present but PAYOUT_ENCRYPTION_KEY is not set")
    return null
  }

  try {
    const [, , ivB64, tagB64, ctB64] = stored.split(":")
    const iv = Buffer.from(ivB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const ciphertext = Buffer.from(ctB64, "base64")
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
    return JSON.parse(plaintext) as Record<string, unknown>
  } catch (error) {
    console.error("[payout-crypto] failed to decrypt payout details", error)
    return null
  }
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
