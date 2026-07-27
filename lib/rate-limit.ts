import "server-only"

// TICK-177 — lightweight rate limiter.
//
// Uses Upstash Redis REST directly (no SDK dependency, per CLAUDE.md's
// "avoid adding deps"). Fixed-window counter via INCR + EXPIRE. When the
// Upstash env vars are absent it falls back to the durable Postgres primitive
// (public.fn_rate_limit via the fn_rate_limit_edge service-role wrapper) so the
// edge endpoints stay enforced even without Redis. If neither backend is
// available it DEGRADES TO A NO-OP (every request allowed), matching the
// codebase's graceful-degradation pattern for optional services — availability
// over enforcement.

const REST_URL = process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number
}

const ALLOW = (limit: number): RateLimitResult => ({ allowed: true, limit, remaining: limit, retryAfter: 0 })

/** Best-effort client identity: authenticated key wins, else forwarded IP. */
export function clientKey(request: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = fwd || request.headers.get("x-real-ip") || "unknown"
  return `ip:${ip}`
}

async function redis(command: (string | number)[]): Promise<any> {
  const res = await fetch(`${REST_URL}/${command.map((c) => encodeURIComponent(String(c))).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  return (await res.json()).result
}

/**
 * Fixed-window limiter. `bucket` namespaces the rule (e.g. "payments:attempt"),
 * `key` is the caller identity (see clientKey). Returns allowed=true (no-op) if
 * Upstash is unconfigured or unreachable — availability over enforcement.
 */
export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!REST_URL || !REST_TOKEN) return dbRateLimit(bucket, key, limit, windowSeconds)

  const redisKey = `rl:${bucket}:${key}`
  try {
    const count: number = await redis(["INCR", redisKey])
    if (count === 1) await redis(["EXPIRE", redisKey, windowSeconds])
    const ttl: number = await redis(["TTL", redisKey])
    const remaining = Math.max(0, limit - count)
    return {
      allowed: count <= limit,
      limit,
      remaining,
      retryAfter: ttl > 0 ? ttl : windowSeconds,
    }
  } catch (error) {
    console.error("[rate-limit] backend error, allowing request", error)
    return ALLOW(limit)
  }
}

/**
 * Durable fallback when Upstash is unconfigured: the shared Postgres
 * fixed-window counter (public.fn_rate_limit) via the service-role-only
 * fn_rate_limit_edge wrapper. Only attempted when a service-role client is
 * actually configured; any error (missing config, network) fails open with
 * ALLOW so a DB hiccup never blocks legitimate traffic.
 */
async function dbRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // Read env at call time (not import) so the no-backend path is deterministic.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return ALLOW(limit)
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()
    // fn_rate_limit_edge is not in the generated RPC types (service-role-only,
    // added out of band); cast per the repo's untyped-RPC convention.
    const { data, error } = await (supabase.rpc as any)("fn_rate_limit_edge", {
      p_bucket: bucket,
      p_key: key,
      p_max: limit,
      p_window_seconds: windowSeconds,
    })
    if (error || !data) return ALLOW(limit)
    const r = data as { allowed?: boolean; remaining?: number; retry_after?: number }
    return {
      allowed: r.allowed !== false,
      limit,
      remaining: Math.max(0, r.remaining ?? limit),
      retryAfter: r.retry_after && r.retry_after > 0 ? r.retry_after : windowSeconds,
    }
  } catch (error) {
    console.error("[rate-limit] db fallback error, allowing request", error)
    return ALLOW(limit)
  }
}

/** 429 response with Retry-After + standard rate-limit headers. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfter),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  })
}
