import "server-only"

import crypto from "crypto"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

const MOMO_BASE_URL =
  process.env.MOMO_BASE_URL ?? "https://sandbox.momodeveloper.mtn.com"
const MOMO_ENVIRONMENT = process.env.MOMO_ENVIRONMENT ?? "sandbox"
const MOMO_DISBURSEMENT_SUBSCRIPTION_KEY =
  process.env.MOMO_DISBURSEMENT_PRIMARY_KEY ?? ""
const MOMO_DISBURSEMENT_API_USER =
  process.env.MOMO_DISBURSEMENT_API_USER ?? process.env.MOMO_API_USER ?? ""
const MOMO_DISBURSEMENT_API_KEY =
  process.env.MOMO_DISBURSEMENT_API_KEY ?? process.env.MOMO_API_KEY ?? ""

type RefundStatus = "requested" | "processing" | "processed" | "failed" | "cancelled"

type RefundRow = {
  id: string
  payment_id: string
  amount_cents: number
  currency: string
  status: RefundStatus
  provider_ref: string | null
  provider_payload: Json | null
}

type PaymentRow = {
  id: string
  provider: string
  amount_cents: number
  currency: string
  ext_payment_id: string | null
  status: string | null
}

type MomoRefundStatus = "PENDING" | "SUCCESSFUL" | "FAILED"

type MomoRefundStatusPayload = Record<string, any> & {
  status?: MomoRefundStatus | string
  amount?: string | number
  currency?: string
  financialTransactionId?: string
  externalId?: string
}

function objectPayload(value: Json | null | undefined): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function requireMomoDisbursementConfig() {
  const missing: string[] = []
  if (!MOMO_DISBURSEMENT_SUBSCRIPTION_KEY) missing.push("MOMO_DISBURSEMENT_PRIMARY_KEY")
  if (!MOMO_DISBURSEMENT_API_USER) missing.push("MOMO_DISBURSEMENT_API_USER")
  if (!MOMO_DISBURSEMENT_API_KEY) missing.push("MOMO_DISBURSEMENT_API_KEY")

  if (missing.length > 0) {
    throw new Error(`MTN MoMo refund configuration is missing: ${missing.join(", ")}`)
  }

  return {
    baseUrl: MOMO_BASE_URL.replace(/\/$/, ""),
    environment: MOMO_ENVIRONMENT,
    subscriptionKey: MOMO_DISBURSEMENT_SUBSCRIPTION_KEY,
    apiUser: MOMO_DISBURSEMENT_API_USER,
    apiKey: MOMO_DISBURSEMENT_API_KEY,
  }
}

async function getMomoDisbursementToken() {
  const config = requireMomoDisbursementConfig()
  const credentials = Buffer.from(`${config.apiUser}:${config.apiKey}`).toString("base64")
  const response = await fetch(`${config.baseUrl}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    },
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as { access_token?: string } | null
  if (!response.ok || !payload?.access_token) {
    throw new Error(`MTN MoMo disbursement token request failed: ${response.status}`)
  }

  return { token: payload.access_token, config }
}

async function loadRefund(refundId: string): Promise<RefundRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("refunds")
    .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
    .eq("id", refundId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load refund: ${error.message}`)
  if (!data) throw new Error("Refund not found")
  return data as RefundRow
}

async function loadPayment(paymentId: string): Promise<PaymentRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payments")
    .select("id, provider, amount_cents, currency, ext_payment_id, status")
    .eq("id", paymentId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load refund payment: ${error.message}`)
  if (!data) throw new Error("Refund payment not found")
  return data as PaymentRow
}

async function transitionRefund(
  refund: RefundRow,
  status: "processed" | "failed",
  providerRef: string,
  providerData: Record<string, any>,
) {
  const admin = createAdminClient()
  const previous = objectPayload(refund.provider_payload)
  const providerPayload = {
    ...previous,
    momo: {
      ...objectPayload(previous.momo as Json | null | undefined),
      ...providerData,
    },
  }

  const { data, error } = await admin
    .rpc("fn_transition_refund", {
      p_refund_id: refund.id,
      p_new_status: status,
      p_provider_ref: providerRef,
      p_provider_payload: providerPayload,
    })
    .single()

  if (error) throw new Error(`Unable to transition refund: ${error.message}`)
  return data
}

function assertRefundMatchesPayment(refund: RefundRow, payment: PaymentRow) {
  if (String(payment.provider).toLowerCase() !== "momo") {
    throw new Error("MTN MoMo refund requires a MoMo payment")
  }
  if (payment.status !== "succeeded" || !payment.ext_payment_id) {
    throw new Error("MTN MoMo refund requires a succeeded payment with its original provider reference")
  }
  if (refund.amount_cents <= 0 || refund.amount_cents > payment.amount_cents) {
    throw new Error("Refund amount is outside the original payment amount")
  }
  if (refund.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    throw new Error("Refund currency does not match the original payment")
  }
}

function assertStatusPayloadMatchesRefund(refund: RefundRow, data: MomoRefundStatusPayload) {
  const amount = Number(data.amount)
  if (Number.isFinite(amount) && amount > 0) {
    const providerCents = Math.round(amount * 100)
    if (providerCents !== refund.amount_cents) {
      throw new Error(`MTN MoMo refund amount ${providerCents} does not match Ticketiv refund ${refund.amount_cents}`)
    }
  }

  const currency = String(data.currency ?? "").trim()
  if (currency && currency.toUpperCase() !== refund.currency.toUpperCase()) {
    throw new Error(`MTN MoMo refund currency ${currency} does not match Ticketiv refund ${refund.currency}`)
  }
}

/**
 * Submit one approved Ticketiv refund through MTN MoMo Disbursement Refund.
 *
 * Ticketiv creates and stores the provider reference before the network call.
 * This makes an uncertain network outcome reconcilable without generating a
 * second refund transaction on retry.
 */
export async function initiateMomoRefund(refundId: string) {
  const current = await loadRefund(refundId)
  const payment = await loadPayment(current.payment_id)
  assertRefundMatchesPayment(current, payment)
  requireMomoDisbursementConfig()

  if (current.status === "processed") {
    return { ok: true, alreadySubmitted: true, status: current.status, providerRef: current.provider_ref }
  }
  if (current.status === "processing") {
    return {
      ok: true,
      alreadySubmitted: true,
      status: current.status,
      providerRef: current.provider_ref,
      needsReconciliation: true,
    }
  }
  if (current.status !== "requested") {
    throw new Error(`Refund cannot be submitted from status: ${current.status}`)
  }

  const providerRef = crypto.randomUUID()
  const previous = objectPayload(current.provider_payload)
  const reason = String(previous.reason ?? "Ticketiv refund").trim().slice(0, 160) || "Ticketiv refund"
  const claimedPayload = {
    ...previous,
    momo: {
      ...objectPayload(previous.momo as Json | null | undefined),
      provider_reference: providerRef,
      original_payment_reference: payment.ext_payment_id,
      submission_started_at: new Date().toISOString(),
    },
  }

  const admin = createAdminClient()
  const { data: claimed, error: claimError } = await admin
    .from("refunds")
    .update({
      status: "processing",
      provider_ref: providerRef,
      provider_payload: claimedPayload,
    })
    .eq("id", refundId)
    .eq("status", "requested")
    .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
    .maybeSingle()

  if (claimError) throw new Error(`Unable to claim MTN MoMo refund: ${claimError.message}`)
  if (!claimed) {
    const raced = await loadRefund(refundId)
    if (raced.status === "processed" || raced.status === "processing") {
      return {
        ok: true,
        alreadySubmitted: true,
        status: raced.status,
        providerRef: raced.provider_ref,
        needsReconciliation: raced.status === "processing",
      }
    }
    throw new Error(`Refund cannot be submitted from status: ${raced.status}`)
  }

  const refund = claimed as RefundRow
  const { token, config } = await getMomoDisbursementToken()

  let response: Response
  try {
    response = await fetch(`${config.baseUrl}/disbursement/v1_0/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": providerRef,
        "X-Target-Environment": config.environment,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: (refund.amount_cents / 100).toFixed(2),
        currency: refund.currency.toUpperCase(),
        externalId: refund.id,
        payerMessage: reason,
        payeeNote: `Ticketiv refund ${refund.id}`.slice(0, 160),
        referenceIdToRefund: payment.ext_payment_id,
      }),
      cache: "no-store",
    })
  } catch (error) {
    throw new Error(
      `MTN MoMo refund submission has an uncertain outcome; reconcile before retrying: ${
        error instanceof Error ? error.message : "network error"
      }`,
    )
  }

  if (response.status !== 202) {
    const body = await response.text().catch(() => "")
    await transitionRefund(refund, "failed", providerRef, {
      response_status: response.status,
      response_body: body.slice(0, 2000),
      submission_failed_at: new Date().toISOString(),
    })
    throw new Error(`MTN MoMo rejected the refund request: ${response.status}${body ? ` — ${body}` : ""}`)
  }

  const refreshedPayload = {
    ...objectPayload(refund.provider_payload),
    momo: {
      ...objectPayload(objectPayload(refund.provider_payload).momo as Json | null | undefined),
      accepted_at: new Date().toISOString(),
      response_status: response.status,
    },
  }
  const { error: persistError } = await admin
    .from("refunds")
    .update({ provider_payload: refreshedPayload })
    .eq("id", refund.id)
    .eq("status", "processing")
  if (persistError) throw new Error(`MTN MoMo refund accepted but metadata persistence failed: ${persistError.message}`)

  return {
    ok: true,
    alreadySubmitted: false,
    status: "processing" as const,
    providerRef,
    needsReconciliation: true,
  }
}

/** Poll MTN MoMo GetRefundStatus and finalise only on provider-confirmed state. */
export async function reconcileMomoRefund(refundId: string) {
  const refund = await loadRefund(refundId)
  if (refund.status === "processed" || refund.status === "failed") {
    return { ok: true, refundId, status: refund.status, alreadyFinal: true }
  }
  if (refund.status === "cancelled") throw new Error("Cancelled refunds cannot be reconciled")
  if (refund.status !== "processing" || !refund.provider_ref) {
    throw new Error("MTN MoMo refund has not been submitted to the provider")
  }

  const { token, config } = await getMomoDisbursementToken()
  const response = await fetch(
    `${config.baseUrl}/disbursement/v1_0/refund/${encodeURIComponent(refund.provider_ref)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": config.environment,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      },
      cache: "no-store",
    },
  )

  const payload = (await response.json().catch(() => null)) as MomoRefundStatusPayload | null
  if (!response.ok || !payload) {
    throw new Error(`Unable to fetch MTN MoMo refund status: ${response.status}`)
  }

  assertStatusPayloadMatchesRefund(refund, payload)
  const providerStatus = String(payload.status ?? "").toUpperCase() as MomoRefundStatus

  if (providerStatus === "PENDING") {
    const previous = objectPayload(refund.provider_payload)
    const providerPayload = {
      ...previous,
      momo: {
        ...objectPayload(previous.momo as Json | null | undefined),
        ...payload,
        reconciled_at: new Date().toISOString(),
        reconciliation_source: "poll",
      },
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from("refunds")
      .update({ provider_payload: providerPayload })
      .eq("id", refund.id)
      .eq("status", "processing")
    if (error) throw new Error(`Unable to persist MTN MoMo refund status: ${error.message}`)
    return { ok: true, refundId, status: "processing" as const, alreadyFinal: false }
  }

  if (providerStatus !== "SUCCESSFUL" && providerStatus !== "FAILED") {
    throw new Error(`Unsupported MTN MoMo refund status: ${String(payload.status ?? "missing")}`)
  }

  const ticketivStatus = providerStatus === "SUCCESSFUL" ? "processed" : "failed"
  const result = await transitionRefund(refund, ticketivStatus, refund.provider_ref, {
    ...payload,
    reconciled_at: new Date().toISOString(),
    reconciliation_source: "poll",
  })

  return { ok: true, refundId, status: ticketivStatus, alreadyFinal: false, result }
}
