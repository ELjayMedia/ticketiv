export const TICKETIV_PUBLIC_ORIGIN = "https://ticketiv.app"
export const TICKETIV_PUBLIC_HOST = "ticketiv.app"

const LEGACY_TICKETIV_HOSTS = new Set(["ticketiv.com", "www.ticketiv.com"])

export function normalizePublicOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    if (LEGACY_TICKETIV_HOSTS.has(url.hostname)) return TICKETIV_PUBLIC_ORIGIN
    return url.origin
  } catch {
    return null
  }
}

export function getTicketivPublicOrigin(runtimeOrigin?: string | null): string {
  return (
    normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizePublicOrigin(runtimeOrigin) ??
    TICKETIV_PUBLIC_ORIGIN
  )
}

export function buildTicketivPublicUrl(path = "", runtimeOrigin?: string | null): string {
  const origin = getTicketivPublicOrigin(runtimeOrigin)
  const normalizedPath = normalizePublicPath(path)
  return `${origin}${normalizedPath}`
}

function normalizePublicPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed || trimmed === "/") return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}
