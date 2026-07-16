export type OrgProfilePayload = {
  name: string
  bio: string | null
  logo: string | null
  default_currency: string
}

export type OrgProfileResult =
  | { ok: true; payload: OrgProfilePayload }
  | { ok: false; error: string }

export function normalizeOrgProfileInput(input: {
  name: FormDataEntryValue | null
  bio: FormDataEntryValue | null
  logo: FormDataEntryValue | null
  defaultCurrency: FormDataEntryValue | null
}): OrgProfileResult {
  const name = String(input.name ?? "").trim()
  const bio = String(input.bio ?? "").trim()
  const logo = String(input.logo ?? "").trim()
  const defaultCurrency = String(input.defaultCurrency ?? "SZL").trim().toUpperCase() || "SZL"

  if (!name) return { ok: false, error: "Organization name is required." }
  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    return { ok: false, error: "Default currency must be a 3-letter ISO currency code." }
  }
  if (logo && !isSupportedLogoUrl(logo)) {
    return { ok: false, error: "Logo must be an https URL or an absolute app path." }
  }

  return {
    ok: true,
    payload: {
      name,
      bio: bio || null,
      logo: logo || null,
      default_currency: defaultCurrency,
    },
  }
}

function isSupportedLogoUrl(value: string) {
  if (value.startsWith("/")) return true

  try {
    const url = new URL(value)
    return url.protocol === "https:"
  } catch {
    return false
  }
}
