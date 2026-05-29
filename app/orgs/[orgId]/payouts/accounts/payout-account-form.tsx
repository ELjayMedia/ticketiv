"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { addPayoutAccountAction } from "./actions"

// TICK-54 — Payout account add form (organizer)
// Details are stored via server action — never plaintext in browser state after submit

const PROVIDERS = [
  { value: "fnb", label: "FNB (First National Bank)" },
  { value: "nedbank", label: "Nedbank" },
  { value: "standard_bank", label: "Standard Bank" },
  { value: "absa", label: "ABSA" },
  { value: "other", label: "Other bank" },
]

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function PayoutAccountForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [provider, setProvider] = useState("fnb")
  const [accountNumber, setAccountNumber] = useState("")
  const [branchCode, setBranchCode] = useState("")
  const [accountName, setAccountName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!accountNumber.trim() || !accountName.trim()) {
      setError("Account number and account holder name are required")
      return
    }
    if (accountNumber.length < 4) {
      setError("Account number must be at least 4 digits")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await addPayoutAccountAction(orgId, provider, accountNumber.trim(), branchCode.trim(), accountName.trim())
      setSuccess(true)
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
          Your banking details are stored securely. You can now request payouts from the payouts page.
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
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <FormField
        label="Account holder name *"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Full legal name on bank account"
        autoComplete="off"
      />

      <FormField
        label="Account number *"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="Bank account number"
        autoComplete="off"
        inputMode="numeric"
      />

      <FormField
        label="Branch code"
        value={branchCode}
        onChange={(e) => setBranchCode(e.target.value)}
        placeholder="e.g. 250655"
        autoComplete="off"
        inputMode="numeric"
      />

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
