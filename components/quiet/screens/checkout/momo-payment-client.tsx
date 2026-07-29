"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel"
import { formatPrice } from "@/lib/format"

const POLL_INTERVAL_MS = 2_500
const POLL_TIMEOUT_MS = 90_000

function looksLikeEswatiniMsisdn(value: string) {
  const digits = value.replace(/\D/g, "")
  return /^(268)?\d{8}$/.test(digits)
}

export function MomoPaymentClient({
  orderId,
  totalMinor,
  currency,
}: {
  orderId: string
  totalMinor: number
  currency: string
}) {
  const router = useRouter()
  const [msisdn, setMsisdn] = React.useState("")
  const [referenceId, setReferenceId] = React.useState<string | null>(null)
  const [state, setState] = React.useState<"idle" | "starting" | "pending" | "failed" | "timed_out">("idle")
  const [error, setError] = React.useState<string | null>(null)
  const cancelledRef = React.useRef(false)

  React.useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  async function poll(reference: string) {
    const startedAt = Date.now()

    while (!cancelledRef.current && Date.now() - startedAt < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      if (cancelledRef.current) return

      const response = await fetch(
        `/api/payments/momo/status?referenceId=${encodeURIComponent(reference)}`,
        { cache: "no-store" },
      )
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setState("failed")
        setError(payload.error || "Unable to check the MTN MoMo payment status.")
        trackBuyerFunnel("payment_failure", {
          order_id: orderId,
          provider: "momo",
          reason: payload.error || "status_check_failed",
        })
        return
      }

      if (payload.status === "SUCCESSFUL") {
        trackBuyerFunnel("payment_success", {
          order_id: orderId,
          provider: "momo",
          total_minor: totalMinor,
          currency,
        })
        router.replace(`/orders/${orderId}/confirmation`)
        router.refresh()
        return
      }

      if (payload.status === "FAILED") {
        setState("failed")
        setError("MTN MoMo declined or could not complete the payment. You can try again.")
        trackBuyerFunnel("payment_failure", {
          order_id: orderId,
          provider: "momo",
          reason: "provider_failed",
        })
        return
      }
    }

    if (!cancelledRef.current) {
      setState("timed_out")
      setError("The MTN MoMo request is still pending. Check your phone, then try checking again.")
      trackBuyerFunnel("payment_pending", {
        order_id: orderId,
        provider: "momo",
        reason: "poll_timeout",
      })
    }
  }

  async function startPayment() {
    setError(null)
    if (!looksLikeEswatiniMsisdn(msisdn)) {
      setError("Enter a valid Eswatini MTN mobile number.")
      return
    }

    setReferenceId(null)
    setState("starting")
    const response = await fetch("/api/payments/momo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, msisdn }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload.referenceId) {
      setState("failed")
      setError(payload.error || "Unable to start the MTN MoMo payment.")
      trackBuyerFunnel("payment_failure", {
        order_id: orderId,
        provider: "momo",
        reason: payload.error || "create_failed",
      })
      return
    }

    setReferenceId(payload.referenceId)
    setState("pending")
    trackBuyerFunnel("payment_pending", {
      order_id: orderId,
      provider: "momo",
      total_minor: totalMinor,
      currency,
    })
    await poll(payload.referenceId)
  }

  async function checkAgain() {
    if (!referenceId) {
      await startPayment()
      return
    }
    setError(null)
    setState("pending")
    await poll(referenceId)
  }

  const busy = state === "starting" || state === "pending"
  const lockNumber = busy || (Boolean(referenceId) && state !== "failed")

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-6">
        <p className="font-mono text-[11px] font-semibold uppercase text-accent">MTN MoMo</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em]">Approve on your phone</h1>
        <p className="mt-2 text-[14px] leading-6 text-ink-3">
          Enter the MTN number that should receive the payment request. Keep this page open while you approve it.
        </p>

        <div className="mt-5 rounded-md bg-bg p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-3">Amount</span>
            <span className="font-mono text-[18px] font-semibold">{formatPrice(totalMinor)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase text-ink-3">
            <span>Order</span>
            <span>{orderId.slice(0, 8)}</span>
          </div>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">MTN mobile number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={msisdn}
            onChange={(event) => setMsisdn(event.target.value)}
            placeholder="76 123 456"
            disabled={lockNumber}
            className="rounded-md border border-line-2 bg-surface px-3 py-3 text-[15px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft disabled:opacity-60"
          />
          <span className="font-mono text-[10px] text-ink-3">Eswatini numbers may be entered with or without +268.</span>
        </label>

        {state === "pending" && (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent-soft px-3 py-3 text-[13px] text-ink">
            Payment request sent. Approve it in the MTN MoMo prompt on your phone.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-3 text-[13px] text-danger">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={state === "timed_out" ? checkAgain : startPayment}
          disabled={busy}
          className="mt-5 w-full rounded-md bg-accent px-4 py-3 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "starting"
            ? "Sending request…"
            : state === "pending"
              ? "Waiting for approval…"
              : state === "timed_out"
                ? "Check payment again"
                : state === "failed"
                  ? "Try again"
                  : `Pay ${formatPrice(totalMinor)} with MTN MoMo`}
        </button>

        <div className="mt-4 flex items-center justify-between text-[12px]">
          <Link href="/support" className="font-semibold text-accent hover:underline">
            Need help?
          </Link>
          <Link href="/browse" className="text-ink-3 hover:text-ink">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  )
}
