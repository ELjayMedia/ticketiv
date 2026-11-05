/**
 * Post-auth destinations. Only same-site paths are honoured, so a crafted
 * `?next=https://evil.example` or `//evil.example` can't turn login into an
 * open redirect.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null
  const next = value.trim()
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null
  return next
}

/** The destination a page was asked to return to (`redirectTo`, `from` or `next`). */
export function requestedNext(params: { get(name: string): string | null } | null | undefined): string | null {
  if (!params) return null
  return safeNext(params.get("redirectTo")) ?? safeNext(params.get("from")) ?? safeNext(params.get("next"))
}
