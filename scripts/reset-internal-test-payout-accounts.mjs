#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFileSync, statSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { createClient } from "@supabase/supabase-js"

import {
  activePayoutEncryptionKeyId,
  decryptPayoutDetails,
  encryptPayoutDetails,
  payoutDetailsKeyId,
  payoutDetailsStorageKind,
} from "../lib/payout-crypto-core.ts"
import { checkEpsAccount } from "../lib/payouts/eps-directory.ts"

const TARGET_ORG_ID = "196d016f-1e10-4cea-a6cc-f46c9ee6734a"
const RETIRED_KEY_ID = "2026-09b"
const APPLY_CONFIRMATION = "RESET_ELJAYTUNES_INTERNAL_TEST_PAYOUT_ACCOUNTS"
const TARGETS = new Map([
  ["80e92d91-e165-4db6-8738-7464953d3b23", "standard_bank"],
  ["8851cf54-4a06-4710-a00d-81fb42c6978e", "fnb"],
])

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function assertReference(name, value) {
  if (value.length < 3 || value.length > 160 || /[\r\n]/.test(value)) {
    throw new Error(`${name} must be a single-line reference between 3 and 160 characters.`)
  }
}

function readProtectedReplacementFile() {
  const path = requiredEnv("PAYOUT_ACCOUNT_RESET_INPUT_FILE")
  const stats = statSync(path)
  if (!stats.isFile()) throw new Error("The payout-account reset input must be a regular file.")
  if ((stats.mode & 0o077) !== 0) {
    throw new Error("The payout-account reset input file must not be accessible by group or other users.")
  }
  if (typeof process.geteuid === "function" && stats.uid !== process.geteuid()) {
    throw new Error("The payout-account reset input file must be owned by the current operator.")
  }

  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    throw new Error("The payout-account reset input file is not valid JSON.")
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("The payout-account reset input must map account IDs to replacement detail objects.")
  }
  return parsed
}

function sameDetails(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function canonicalReplacementDetails(accountId, replacement) {
  const provider = TARGETS.get(accountId)
  if (!provider || !replacement || Array.isArray(replacement) || typeof replacement !== "object") {
    throw new Error("Each replacement payout account must be a non-empty detail object.")
  }
  const accountName = typeof replacement.account_name === "string" ? replacement.account_name.trim() : ""
  const accountNumber = typeof replacement.account_number === "string" ? replacement.account_number : ""
  const branchCode = typeof replacement.branch_code === "string" ? replacement.branch_code.trim() : ""
  if (!accountName || !accountNumber) {
    throw new Error("Each replacement payout account requires an account name and account number.")
  }

  const checked = checkEpsAccount(provider, accountNumber)
  if (!checked.ok) {
    throw new Error("A replacement payout account failed the supported EPS account validation.")
  }
  return {
    account_name: accountName,
    account_number: checked.accountNumber,
    branch_code: checked.destination.scheme === "EWLT" ? null : branchCode || null,
    provider,
    eps_agent_id: checked.destination.agentId,
    eps_scheme: checked.destination.scheme,
  }
}

export function buildInternalTestPayoutAccountResetPlan(rows, replacementDetailsById) {
  const activeKeyId = activePayoutEncryptionKeyId()
  if (activeKeyId === RETIRED_KEY_ID) {
    throw new Error("The replacement key ID must not reuse the retired 2026-09b identifier.")
  }
  if (!replacementDetailsById || Array.isArray(replacementDetailsById) || typeof replacementDetailsById !== "object") {
    throw new Error("Replacement payout-account details must be an object keyed by account ID.")
  }

  const rowIds = rows.map((row) => row?.id).sort()
  const targetIds = [...TARGETS.keys()].sort()
  const replacementIds = Object.keys(replacementDetailsById).sort()
  if (JSON.stringify(rowIds) !== JSON.stringify(targetIds)) {
    throw new Error("The live payout-account inventory does not match the reviewed two-account allowlist.")
  }
  if (JSON.stringify(replacementIds) !== JSON.stringify(targetIds)) {
    throw new Error("Replacement details must contain exactly the reviewed two payout-account IDs.")
  }

  const candidates = rows.map((row) => {
    const expectedProvider = TARGETS.get(row.id)
    if (row.org_id !== TARGET_ORG_ID || row.provider !== expectedProvider) {
      throw new Error("A target payout account no longer matches the reviewed organization and provider.")
    }
    if (payoutDetailsStorageKind(row.details_encrypted) !== "encrypted-v2" || payoutDetailsKeyId(row.details_encrypted) !== RETIRED_KEY_ID) {
      throw new Error("A target payout account no longer uses the reviewed retired encrypted format.")
    }

    const replacement = canonicalReplacementDetails(row.id, replacementDetailsById[row.id])
    const encryptedDetails = encryptPayoutDetails(replacement)
    if (payoutDetailsKeyId(encryptedDetails) !== activeKeyId || !sameDetails(decryptPayoutDetails(encryptedDetails), replacement)) {
      throw new Error("Replacement payout-account encryption verification failed.")
    }

    return {
      accountId: row.id,
      expectedSha256: createHash("sha256").update(row.details_encrypted, "utf8").digest("hex"),
      encryptedDetails,
      expectedDetails: replacement,
    }
  })

  return {
    summary: {
      organizationId: TARGET_ORG_ID,
      accountIds: targetIds,
      accountCount: candidates.length,
      previousKeyId: RETIRED_KEY_ID,
      replacementKeyId: activeKeyId,
    },
    candidates,
  }
}

async function fetchTargetRows(client) {
  const { data, error } = await client
    .from("payout_accounts")
    .select("id, org_id, provider, is_primary, details_encrypted")
    .eq("org_id", TARGET_ORG_ID)

  if (error) throw new Error("Unable to read the reviewed payout-account inventory.")
  return data ?? []
}

async function assertNoPayoutInFlight(client) {
  const { count, error } = await client
    .from("payouts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", TARGET_ORG_ID)
    .in("status", ["requested", "processing"])
  if (error) throw new Error("Unable to verify the payout queue state.")
  if ((count ?? 0) !== 0) throw new Error("Reset blocked because an organizer payout is in flight.")
}

function printSummary(mode, summary) {
  console.log(JSON.stringify({ mode, ...summary }))
}

export async function runInternalTestPayoutAccountReset({ apply = false } = {}) {
  if (apply && process.env.PAYOUT_ACCOUNT_RESET_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(`Write mode requires PAYOUT_ACCOUNT_RESET_CONFIRM=${APPLY_CONFIRMATION}.`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || requiredEnv("SUPABASE_URL")
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  const replacements = readProtectedReplacementFile()
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await assertNoPayoutInFlight(client)
  const plan = buildInternalTestPayoutAccountResetPlan(await fetchTargetRows(client), replacements)
  printSummary(apply ? "apply-preflight" : "dry-run", plan.summary)
  if (!apply) return plan.summary

  const backupReference = requiredEnv("PAYOUT_ACCOUNT_RESET_BACKUP_REFERENCE")
  const reviewReference = requiredEnv("PAYOUT_ACCOUNT_RESET_REVIEW_REFERENCE")
  assertReference("PAYOUT_ACCOUNT_RESET_BACKUP_REFERENCE", backupReference)
  assertReference("PAYOUT_ACCOUNT_RESET_REVIEW_REFERENCE", reviewReference)

  for (const candidate of plan.candidates) {
    const { data, error } = await client.rpc("admin_reencrypt_payout_account", {
      p_account_id: candidate.accountId,
      p_expected_sha256: candidate.expectedSha256,
      p_encrypted_details: candidate.encryptedDetails,
    })
    if (error) throw new Error("The controlled payout-account reset RPC failed.")
    if (data !== true) throw new Error("The controlled reset stopped because a target row changed after preflight.")

    // The compare-and-swap RPC writes its own atomic metadata-only audit entry.
    // Add the reviewed recovery references separately without ever sending
    // replacement bank details, ciphertext or encryption material to the log.
    const { error: auditError } = await client.rpc("admin_log_action", {
      p_actor_id: null,
      p_table_name: "payout_accounts",
      p_record_id: candidate.accountId,
      p_action: "update",
      p_changes: {
        business_action: "reset_internal_test_payout_account",
        previous_key_id: RETIRED_KEY_ID,
        replacement_key_id: plan.summary.replacementKeyId,
        backup_reference: backupReference,
        review_reference: reviewReference,
      },
      p_org_id: TARGET_ORG_ID,
    })
    if (auditError) {
      throw new Error("The reset was compare-and-swap audited, but its change-control reference audit failed. Stop and review before retrying.")
    }
  }

  const verifiedRows = await fetchTargetRows(client)
  if (verifiedRows.length !== TARGETS.size || verifiedRows.some((row) => payoutDetailsKeyId(row.details_encrypted) !== plan.summary.replacementKeyId)) {
    throw new Error("The post-reset payout-account key-ID verification failed.")
  }
  for (const row of verifiedRows) {
    const candidate = plan.candidates.find((entry) => entry.accountId === row.id)
    if (!candidate || !sameDetails(decryptPayoutDetails(row.details_encrypted), candidate.expectedDetails)) {
      throw new Error("The post-reset payout-account decryption verification failed.")
    }
  }

  printSummary("apply-verification", plan.summary)
  return plan.summary
}

const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (isCli) {
  runInternalTestPayoutAccountReset({ apply: process.argv.includes("--apply") }).catch((error) => {
    console.error(error instanceof Error ? error.message : "Controlled payout-account reset failed.")
    process.exitCode = 1
  })
}
