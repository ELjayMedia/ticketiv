import "server-only"

// Shared result shape for every transactional channel adapter (email, SMS,
// WhatsApp, …). Keeping it provider-agnostic lets the dispatcher log and
// branch uniformly regardless of which provider actually ran.
//
// - sent    → handed off to the provider; `ref` is the provider message id
// - skipped → intentionally not attempted (channel unconfigured / no creds)
// - failed  → attempted but the provider rejected/errored

export type ChannelStatus = "sent" | "skipped" | "failed"

export type ChannelResult =
  | { status: "sent"; ref: string | null; provider: string; meta?: Record<string, unknown> }
  | { status: "skipped"; reason: string; provider: string }
  | { status: "failed"; error: string; provider: string }
