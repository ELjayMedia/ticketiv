// MTN MoMo Collections API (Eswatini / mtnswaziland environment)
// Credentials come from env vars — never hardcode.
const MOMO_BASE_URL =
  process.env.MOMO_BASE_URL ?? "https://sandbox.momodeveloper.mtn.com"
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_COLLECTIONS_PRIMARY_KEY ?? ""
const MOMO_API_USER = process.env.MOMO_API_USER ?? ""
const MOMO_API_KEY = process.env.MOMO_API_KEY ?? ""
const MOMO_ENVIRONMENT = process.env.MOMO_ENVIRONMENT ?? "sandbox"
// For production Eswatini: MOMO_ENVIRONMENT=mtnswaziland, currency=SZL

async function getMomoToken(): Promise<string> {
  const credentials = Buffer.from(`${MOMO_API_USER}:${MOMO_API_KEY}`).toString("base64")
  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
    },
  })
  if (!res.ok) throw new Error(`MoMo token error: ${res.status}`)
  const data = await res.json()
  return data.access_token as string
}

export interface MomoRequestParams {
  // Supplied by the caller so the payment_attempts row can be written *before*
  // the debit is requested — otherwise a failed insert orphans a real charge
  // that nothing can match on ext_ref.
  referenceId: string
  amount: number // in SZL (whole number, no cents)
  msisdn: string // normalised to 268XXXXXXXX
  externalId: string // your payment_attempt ID
  payerMessage: string // shown on the MoMo prompt
  payeeNote: string // internal note
}

export async function requestMomoPayment(params: MomoRequestParams): Promise<string> {
  // Returns the MoMo referenceId (UUID) — already stored on payment_attempts
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new Error(`MoMo amount must be a whole positive SZL value, got ${params.amount}`)
  }
  const token = await getMomoToken()
  const referenceId = params.referenceId
  const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": MOMO_ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: "SZL",
      externalId: params.externalId,
      payer: { partyIdType: "MSISDN", partyId: params.msisdn },
      payerMessage: params.payerMessage,
      payeeNote: params.payeeNote,
    }),
  })
  if (res.status !== 202) {
    const body = await res.text()
    throw new Error(`MoMo requesttopay failed: ${res.status} — ${body}`)
  }
  return referenceId
}

export type MomoStatus = "PENDING" | "SUCCESSFUL" | "FAILED"

export async function checkMomoStatus(referenceId: string): Promise<MomoStatus> {
  const token = await getMomoToken()
  const res = await fetch(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": MOMO_ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    },
  )
  if (!res.ok) throw new Error(`MoMo status check failed: ${res.status}`)
  const data = await res.json()
  return data.status as MomoStatus
}

// Normalise Eswatini phone numbers to 268XXXXXXXX
export function normaliseMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("268") && digits.length === 11) return digits
  if (digits.length === 8) return `268${digits}`
  throw new Error(`Cannot normalise MSISDN: ${raw}`)
}
