export const ISOLATED_UAT_API = "https://uat-api.ticketiv.app"

/** Mutation-backed tests must never accept the production project or a lookalike host. */
export function isIsolatedUatTarget(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.origin === ISOLATED_UAT_API && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password
  } catch {
    return false
  }
}

export function assertIsolatedUatTarget(value: string | null | undefined): void {
  if (!isIsolatedUatTarget(value)) {
    throw new Error(`Mutation-backed UAT requires ${ISOLATED_UAT_API}; production and other targets are rejected.`)
  }
}
