"use server"

import { DELTAPAY_PUBLIC_KEY, DELTAPAY_SECRET_KEY, DELTAPAY_ENVIRONMENT } from "./env"

interface DeltaPayConfig {
  publicKey: string
  secretKey: string
  environment: "dev" | "prod"
}

interface DeltaPayAuthResponse {
  token_type: string
  access_token: string
  refresh_token: string
  user_id: number
  username: string
}

interface DeltaPayPaymentIntent {
  id: string
  amount: number
  currency: string
  status: "pending" | "processing" | "completed" | "failed"
  metadata?: Record<string, any>
}

class DeltaPayClient {
  private config: DeltaPayConfig
  private baseUrl: string

  constructor(config: DeltaPayConfig) {
    this.config = config
    this.baseUrl = config.environment === "prod" ? "https://api.prod.deltacrypt.net" : "https://api.dev.deltacrypt.net"
  }

  private getHeaders(useApiKey = true): HeadersInit {
    if (useApiKey) {
      return {
        "Content-Type": "application/json",
        "x-api-key": this.config.secretKey,
        accept: "application/json",
      }
    }
    return {
      "Content-Type": "application/json",
      accept: "application/json",
    }
  }

  async authenticateUser(username: string, password: string): Promise<DeltaPayAuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Authentication failed")
    }

    return response.json()
  }

  async createPaymentIntent(params: {
    amount: number
    currency: string
    orderId: string
    customerEmail: string
    metadata?: Record<string, any>
  }): Promise<DeltaPayPaymentIntent> {
    // DeltaPay uses blockchain transactions for payments
    // This creates a payment intent that will be signed by the user's wallet
    const response = await fetch(`${this.baseUrl}/payment/create`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        reference: params.orderId,
        customer_email: params.customerEmail,
        metadata: params.metadata,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create payment intent")
    }

    return response.json()
  }

  async verifyPayment(paymentId: string): Promise<DeltaPayPaymentIntent> {
    const response = await fetch(`${this.baseUrl}/payment/${paymentId}`, {
      method: "GET",
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to verify payment")
    }

    return response.json()
  }

  async getAccountBalance(accountId: number): Promise<{ balance: number; currency: string }> {
    const response = await fetch(`${this.baseUrl}/account/${accountId}/balance`, {
      method: "GET",
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to get account balance")
    }

    return response.json()
  }

  async initiateTransfer(params: {
    fromAccountId: number
    toAccountId: number
    amount: number
    currency: string
    description?: string
  }): Promise<{ transaction_id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/transfer/initiate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        from_account_id: params.fromAccountId,
        to_account_id: params.toAccountId,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to initiate transfer")
    }

    return response.json()
  }
}

export async function getDeltaPayClient(): Promise<DeltaPayClient | null> {
  const publicKey = DELTAPAY_PUBLIC_KEY
  const secretKey = DELTAPAY_SECRET_KEY
  const environment = DELTAPAY_ENVIRONMENT

  if (!publicKey || !secretKey) {
    console.warn("[DeltaPay] API keys not configured")
    return null
  }

  return new DeltaPayClient({
    publicKey,
    secretKey,
    environment,
  })
}

export async function createDeltaPayPayment(params: {
  amount: number
  currency: string
  orderId: string
  customerEmail: string
  metadata?: Record<string, any>
}): Promise<DeltaPayPaymentIntent> {
  const client = await getDeltaPayClient()

  if (!client) {
    throw new Error("DeltaPay is not configured")
  }

  return client.createPaymentIntent(params)
}

export async function verifyDeltaPayPayment(paymentId: string): Promise<DeltaPayPaymentIntent> {
  const client = await getDeltaPayClient()

  if (!client) {
    throw new Error("DeltaPay is not configured")
  }

  return client.verifyPayment(paymentId)
}
