/**
 * Payout destinations reachable through the Eswatini Payment Switch (EPS),
 * which DeltaPay disburses to from Ticketiv's wallet.
 *
 * Source: DeltaPay API docs, "Eswatini Payment Switch (EPS) → Current EPS
 * Participants" (based on the Central Bank of Eswatini Wallet and Account
 * Guidelines). Keep in sync with that table.
 *
 *   ACCT = bank account, EWLT = mobile-money / e-wallet (phone-number based).
 *
 * Providers not listed here (e.g. "absa", "other") stay valid payout
 * accounts but can only be paid manually.
 */

export type EpsAccountScheme = "ACCT" | "EWLT"

export interface EpsDestination {
  /** Stored payout_accounts.provider value. */
  provider: string
  label: string
  /** EPS institution ("instructed agent") code. */
  agentId: string
  scheme: EpsAccountScheme
  /** Account / wallet number format, whole string. */
  pattern: RegExp
  example: string
}

export const EPS_DESTINATIONS: EpsDestination[] = [
  { provider: "fnb", label: "FNB (First National Bank)", agentId: "103002", scheme: "ACCT", pattern: /^(?:5\d{10}|6[23]\d{9})$/, example: "62123456789" },
  { provider: "standard_bank", label: "Standard Bank", agentId: "103004", scheme: "ACCT", pattern: /^911\d{10}$/, example: "9111234567890" },
  { provider: "nedbank", label: "Nedbank", agentId: "103003", scheme: "ACCT", pattern: /^(?:1[12]99|[2-8]000)\d{7}$/, example: "80001234567" },
  { provider: "eswatini_bank", label: "Eswatini Bank", agentId: "103001", scheme: "ACCT", pattern: /^77[04]\d{8}$/, example: "77012345678" },
  { provider: "sbs", label: "Swaziland Building Society", agentId: "203005", scheme: "ACCT", pattern: /^5\d{10}$/, example: "51234567890" },
  { provider: "unayo", label: "Standard Bank Unayo", agentId: "203004", scheme: "ACCT", pattern: /^455\d{10}$/, example: "4551234567890" },
  { provider: "mtn_momo", label: "MTN MoMo", agentId: "203003", scheme: "EWLT", pattern: /^7[68]\d{6}$/, example: "76123456" },
  { provider: "eswatini_mobile", label: "Eswatini Mobile e-Mali", agentId: "203001", scheme: "EWLT", pattern: /^79\d{6}$/, example: "79123456" },
  { provider: "instacash", label: "Instacash", agentId: "203002", scheme: "EWLT", pattern: /^7\d{7}$/, example: "76123456" },
  { provider: "deltapay", label: "DeltaPay wallet", agentId: "203006", scheme: "EWLT", pattern: /^(?:7\d{7}|\d{1,7})$/, example: "76123456" },
]

const BY_PROVIDER = new Map(EPS_DESTINATIONS.map((d) => [d.provider, d]))

export function epsDestinationFor(provider: string | null | undefined): EpsDestination | null {
  return provider ? BY_PROVIDER.get(provider) ?? null : null
}

/** Account numbers are stored and sent as digits only (spaces and dashes are typing aids). */
export function normalizeEpsAccountNumber(input: string): string {
  return input.replace(/[\s-]/g, "")
}

/** Phone-number wallets: accept +268 / 268 prefixes and keep the 8-digit local number. */
function normalizeWalletNumber(input: string): string {
  const digits = normalizeEpsAccountNumber(input).replace(/^\+/, "")
  return digits.length === 11 && digits.startsWith("268") ? digits.slice(3) : digits
}

export type EpsAccountCheck =
  | { ok: true; destination: EpsDestination; accountNumber: string }
  | { ok: false; reason: "not_eps" | "invalid_number"; message: string }

/**
 * Checks an account against the switch's published format for its institution
 * before it is saved, so a payout can't fail later on a typo.
 */
export function checkEpsAccount(provider: string, rawNumber: string): EpsAccountCheck {
  const destination = epsDestinationFor(provider)
  if (!destination) {
    return { ok: false, reason: "not_eps", message: "This bank can only be paid manually." }
  }
  const accountNumber =
    destination.scheme === "EWLT" ? normalizeWalletNumber(rawNumber) : normalizeEpsAccountNumber(rawNumber)
  if (!destination.pattern.test(accountNumber)) {
    return {
      ok: false,
      reason: "invalid_number",
      message:
        destination.scheme === "EWLT"
          ? `Enter the ${destination.label} number, for example ${destination.example}.`
          : `That doesn't look like a ${destination.label} account number (for example ${destination.example}).`,
    }
  }
  return { ok: true, destination, accountNumber }
}
