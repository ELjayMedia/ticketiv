import type React from "react"

import { ConsumerFrame } from "@/components/quiet/shell/consumer-frame"
import { PublicSessionDesktopNav } from "@/components/quiet/shell/public-session-desktop-nav"

/**
 * Public pages must not depend on authenticated workspace shell code: the
 * desktop nav hydrates identity in the browser (PublicSessionDesktopNav), so
 * auth/session failures can't take down public discovery routes and the pages
 * stay cacheable. Every public page gets the same nav, footer and tab bar as
 * Discover instead of looking like a stand-alone phone screen on desktop.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <ConsumerFrame desktopNav={<PublicSessionDesktopNav />}>{children}</ConsumerFrame>
}
