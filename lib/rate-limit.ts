import "server-only"

// TICK-177 — lightweight rate limiter.
//
// Uses Upstash Redis REST directly (no SDK dependency, per CLAUDE.md's
// "avoid adding deps"). Fixed-window counter via INCR + EXPIRE. When the
// Upstash env vars are absent it DEGRADES TO A NO-OP (every request allowed),
// matching the codebase's graceful-degradation pattern for optional services.

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
  if (!REST_URL || !REST_TOKEN) return ALLOW(limit)

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
