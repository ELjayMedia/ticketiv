export type PaystackKeyMode = "test" | "live" | "unknown"

type PaystackDeploymentEnvironment = "production" | "preview" | "development" | "local" | "unknown"

export function resolvePaystackKeyMode(secretKey: string | null | undefined): PaystackKeyMode {
  const key = (secretKey ?? "").trim()
  if (key.startsWith("sk_test_")) return "test"
  if (key.startsWith("sk_live_")) return "live"
  return "unknown"
}

function resolvePaystackDeploymentEnvironment(vercelEnv: string | null | undefined): PaystackDeploymentEnvironment {
  const normalized = vercelEnv?.trim().toLowerCase()
  if (normalized === "production" || normalized === "preview" || normalized === "development") return normalized
  if (normalized) return "unknown"
  return "local"
}

/**
 * Live Paystack credentials must only resolve from the Vercel production
 * environment. Preview/UAT share production data, so a live key there is a
 * live-money mistake, even if PAYSTACK_ALLOW_LIVE_MODE was copied over too.
 */
export function assertPaystackModeAllowed(
  secretKey: string | null | undefined,
  allowLive: boolean,
  vercelEnv = process.env.VERCEL_ENV,
) {
  const mode = resolvePaystackKeyMode(secretKey)
  if (mode !== "live") return

  const deploymentEnvironment = resolvePaystackDeploymentEnvironment(vercelEnv)

  if (deploymentEnvironment !== "production") {
    throw new Error(
      "Refusing to use a live Paystack key outside Vercel production. " +
        "Preview and local deployments cannot resolve live payment credentials (TICK-342).",
    )
  }

  if (!allowLive) {
    throw new Error(
      "Refusing to use a live Paystack key: PAYSTACK_ALLOW_LIVE_MODE is not set to \"true\". " +
        "Ticketiv runs UAT against the same environment as production, so live keys stay disabled " +
        "until the money path is signed off (TICK-61).",
    )
  }
}
