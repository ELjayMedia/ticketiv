#!/usr/bin/env node

import { createHash } from "node:crypto"
import { pathToFileURL } from "node:url"
import { createClient } from "@supabase/supabase-js"

import {
  activePayoutEncryptionKeyId,
  decryptPayoutDetails,
  encryptPayoutDetails,
  payoutDetailsKeyId,
  payoutDetailsStorageKind,
} from "../lib/payout-crypto-core.ts"

const APPLY_CONFIRMATION = "REENCRYPT_PAYOUT_ACCOUNTS"
const DEFAULT_MAX_ROWS = 1_000

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function maxRowsFromEnv() {
  const raw = process.env.PAYOUT_REENCRYPT_MAX_ROWS
  if (!raw) return DEFAULT_MAX_ROWS

  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100_000) {
    throw new Error("PAYOUT_REENCRYPT_MAX_ROWS must be an integer between 1 and 100000.")
  }
  return parsed
}

function emptyFormatCounts() {
  return {
    "legacy-plaintext": 0,
    "encrypted-v1": 0,
    "retired-v2-key": 0,
  }
}

export function buildPayoutReencryptionPlan(rows) {
  const activeKeyId = activePayoutEncryptionKeyId()
  const candidates = []
  const candidateFormats = emptyFormatCounts()
  let currentRows = 0
  let unreadableRows = 0

  for (const row of rows) {
    const stored = typeof row?.details_encrypted === "string" ? row.details_encrypted : ""
    const kind = payoutDetailsStorageKind(stored)
    const keyId = kind === "encrypted-v2" ? payoutDetailsKeyId(stored) : null
    const details = decryptPayoutDetails(stored)

    if (!details || typeof row?.id !== "string" || !row.id) {
      unreadableRows += 1
      continue
    }

    if (kind === "encrypted-v2" && keyId === activeKeyId) {
      currentRows += 1
      continue
    }

    const format = kind === "encrypted-v2" ? "retired-v2-key" : kind
    if (!(format in candidateFormats)) {
      unreadableRows += 1
      continue
    }

    const encryptedDetails = encryptPayoutDetails(details)
    if (payoutDetailsKeyId(encryptedDetails) !== activeKeyId) {
      throw new Error("Payout detail replacement did not use the active encryption key.")
    }

    candidateFormats[format] += 1
    candidates.push({
      accountId: row.id,
      expectedSha256: createHash("sha256").update(stored, "utf8").digest("hex"),
      encryptedDetails,
    })
  }

  return {
    summary: {
      totalRows: rows.length,
      currentRows,
      candidateRows: candidates.length,
      unreadableRows,
      candidateFormats,
    },
    candidates,
  }
}

async function fetchRows(client, maxRows) {
  const { data, error } = await client
    .from("payout_accounts")
    .select("id, details_encrypted")
    .limit(maxRows + 1)

  if (error) throw new Error("Unable to read payout account storage formats.")
  if ((data?.length ?? 0) > maxRows) {
    throw new Error(`Payout account count exceeds the configured ${maxRows}-row safety limit.`)
  }

  return data ?? []
}

function printSummary(mode, summary) {
  console.log(JSON.stringify({ mode, ...summary }))
}

export async function runPayoutReencryption({ apply = false } = {}) {
  if (apply && process.env.PAYOUT_REENCRYPT_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(`Write mode requires PAYOUT_REENCRYPT_CONFIRM=${APPLY_CONFIRMATION}.`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || requiredEnv("SUPABASE_URL")
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  const maxRows = maxRowsFromEnv()

  // Validate the active key and retained keyring before reading any rows.
  activePayoutEncryptionKeyId()

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const initial = buildPayoutReencryptionPlan(await fetchRows(client, maxRows))
  printSummary(apply ? "apply-preflight" : "dry-run", initial.summary)

  if (initial.summary.unreadableRows > 0) {
    throw new Error("Payout re-encryption stopped because one or more rows could not be decrypted safely.")
  }
  if (!apply) return initial.summary

  for (const candidate of initial.candidates) {
    const { data, error } = await client.rpc("admin_reencrypt_payout_account", {
      p_account_id: candidate.accountId,
      p_expected_sha256: candidate.expectedSha256,
      p_encrypted_details: candidate.encryptedDetails,
    })

    if (error) throw new Error("Payout re-encryption RPC failed.")
    if (data !== true) {
      throw new Error("Payout re-encryption stopped because a row changed after the dry-run check.")
    }
  }

  const verification = buildPayoutReencryptionPlan(await fetchRows(client, maxRows))
  printSummary("apply-verification", verification.summary)
  if (verification.summary.candidateRows > 0 || verification.summary.unreadableRows > 0) {
    throw new Error("Payout re-encryption verification did not reach the active encrypted format for every row.")
  }

  return verification.summary
}

const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (isCli) {
  runPayoutReencryption({ apply: process.argv.includes("--apply") }).catch((error) => {
    console.error(error instanceof Error ? error.message : "Payout re-encryption failed.")
    process.exitCode = 1
  })
}
