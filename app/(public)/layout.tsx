import type React from "react"

/**
 * Public pages must not depend on authenticated workspace shell code. Keeping
 * this layout deliberately minimal prevents auth/session/sidebar failures from
 * taking down public discovery routes like /, /browse, /events and /artists.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
