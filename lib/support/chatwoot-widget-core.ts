export interface ChatwootWidgetConfig {
  baseUrl: string
  websiteToken: string
}

/**
 * Validate the public website-inbox settings before they reach the browser.
 * The website token identifies a Chatwoot inbox; it is intentionally public
 * and is the same value included in Chatwoot's standard widget snippet.
 */
export function chatwootWidgetConfig(
  baseUrlValue: string | undefined,
  websiteTokenValue: string | undefined,
): ChatwootWidgetConfig | null {
  const baseUrl = baseUrlValue?.trim()
  const websiteToken = websiteTokenValue?.trim()
  if (!baseUrl || !websiteToken || !/^[A-Za-z0-9_-]{16,128}$/.test(websiteToken)) return null

  try {
    const url = new URL(baseUrl)
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null
    return { baseUrl: url.origin, websiteToken }
  } catch {
    return null
  }
}

export function chatwootSdkUrl(config: Pick<ChatwootWidgetConfig, "baseUrl">): string {
  return `${config.baseUrl}/packs/js/sdk.js`
}
