/**
 * Display name for a stored payout provider value ("standard_bank" → "Standard Bank").
 * Plain module (no "use client"): server pages and client components both use it.
 */
const KNOWN: Record<string, string> = {
  fnb: "FNB",
  nedbank: "Nedbank",
  standard_bank: "Standard Bank",
  eswatini_bank: "Eswatini Bank",
  sbs: "Swaziland Building Society",
  unayo: "Standard Bank Unayo",
  mtn_momo: "MTN MoMo",
  eswatini_mobile: "Eswatini Mobile e-Mali",
  instacash: "Instacash",
  deltapay: "DeltaPay",
  absa: "ABSA",
  other: "Other bank",
}

export function providerLabel(provider: string): string {
  return KNOWN[provider] ?? provider.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
