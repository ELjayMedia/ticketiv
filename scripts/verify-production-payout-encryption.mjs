#!/usr/bin/env node

import { pathToFileURL } from "node:url"

import { activePayoutEncryptionKeyId } from "../lib/payout-crypto-core.ts"

/**
 * Production deployment gate for TICK-376.
 *
 * Vercel production builds must have a valid active payout-encryption keyring.
 * Preview and local builds intentionally skip this check so they do not need
 * production secrets.
 */
export function verifyProductionPayoutEncryption({
  vercelEnv = process.env.VERCEL_ENV,
  verifyKeyring = activePayoutEncryptionKeyId,
} = {}) {
  if (vercelEnv !== "production") {
    return { checked: false }
  }

  verifyKeyring()
  return { checked: true }
}

function runCli() {
  try {
    const result = verifyProductionPayoutEncryption()
    if (result.checked) {
      // Deliberately do not print a key id or any secret material.
      console.log("Production payout encryption configuration verified.")
    }
  } catch {
    console.error(
      "Production payout encryption configuration is missing or invalid. Refusing to build.",
    )
    process.exitCode = 1
  }
}

const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (isCli) runCli()
