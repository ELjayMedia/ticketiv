"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { EPS_DESTINATIONS, checkEpsAccount, epsDestinationFor } from "@/lib/payouts/eps-directory"
import { addPayoutAccountAction } from "./actions"

// TICK-54 — Payout account add form (organizer)
// Details are stored via server action — never plaintext in browser state after submit

// Banks and mobile wallets on the Eswatini Payment Switch can be paid out
// automatically; the rest are paid manually by finance.
const BANKS = EPS_DESTINATIONS.filter((d) => d.scheme === "ACCT").map((d) => ({ value: d.provider, label: d.label }))
const WALLETS = EPS_DESTINATIONS.filter((d) => d.scheme === "EWLT").map((d) => ({ value: d.provider, label: d.label }))
const MANUAL = [
  { value: "absa", label: "ABSA" },
  { value: "other", label: "Other bank" },
]

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function PayoutAccountForm({ orgId, hasAccounts }: { orgId: string; hasAccounts: boolean }) {
  const router = useRouter()
  const [provider, setProvider] = useState("fnb")
  const [accountNumber, setAccountNumber] = useState("")
  const [branchCode, setBranchCode] = useState("")
  const [accountName, setAccountName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [makePrimary, setMakePrimary] = useState(false)
  const destination = epsDestinationFor(provider)
  const isWallet = destination?.scheme === "EWLT"

  async function handleSubmit() {
    if (!accountNumber.trim() || !accountName.trim()) {
      setError("Account number and account holder name are required")
      return
    }
    if (accountNumber.length < 4) {
      setError("Account number must be at least 4 digits")
      return
    }
    if (destination) {
      const check = checkEpsAccount(provider, accountNumber)
      if (!check.ok) {
        setError(check.message)
        return
      }
    }
    setSubmitting(true)
    setError("")
    try {
      await addPayoutAccountAction(orgId, provider, accountNumber.trim(), branchCode.trim(), accountName.trim(), makePrimary)
      setSuccess(true)
      setMakePrimary(false)
      setAccountNumber("")
      setBranchCode("")
      setAccountName("")
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Failed to save payout account")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-[14px] font-semibold text-ink">Payout account added.</p>
        <p className="text-[13px] text-ink-3">
          Your banking details are stored securely. Payouts are sent to the account marked Primary.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
          Add another
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-label">Bank / provider</span>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={selectClass}
        >
          <optgroup label="Banks">
            {BANKS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Mobile money">
            {WALLETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Paid manually">
            {MANUAL.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <FormField
        label="Account holder name *"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder={isWallet ? "Full name registered on the wallet" : "Full legal name on bank account"}
        autoComplete="off"
      />

      <FormField
        label={isWallet ? "Mobile number *" : "Account number *"}
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder={destination ? `e.g. ${destination.example}` : "Bank account number"}
        hint={destination ? undefined : "Payouts to this bank are made manually by Ticketiv finance."}
        autoComplete="off"
        inputMode="numeric"
      />

      {!isWallet && (
      <FormField
        label="Branch code"
        value={branchCode}
        onChange={(e) => setBranchCode(e.target.value)}
        placeholder="e.g. 250655"
        autoComplete="off"
        inputMode="numeric"
      />
      )}

      {hasAccounts ? (
        <label className="flex items-start gap-2 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={makePrimary}
            onChange={(e) => setMakePrimary(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>Make this the primary account. Payouts are sent to the primary account.</span>
        </label>
      ) : (
        <p className="text-[12px] text-ink-3">This will be your primary account: payouts are sent here.</p>
      )}

      <p className="rounded-[var(--radius-md)] bg-surface-2 px-3 py-2 text-[12px] text-ink-3">
        Your account details are stored encrypted and never displayed in full after saving.
        Ticketiv staff can only see the last 4 digits to confirm identity.
      </p>

      {error && (
        <p className="rounded-[var(--radius-sm)] border border-danger/30 bg-surface px-3 py-2 text-[12px] text-danger">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="md"
        onClick={handleSubmit}
        disabled={submitting || !accountNumber.trim() || !accountName.trim()}
      >
        {submitting ? "Saving…" : "Save payout account"}
      </Button>
    </div>
  )
}
