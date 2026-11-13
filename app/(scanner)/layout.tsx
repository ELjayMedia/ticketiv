import type React from "react"

import { WorkspaceShell } from "@/components/quiet/shell/workspace-shell"
import { ORGANIZER_ICONS } from "@/lib/brand/icons"

export const dynamic = "force-dynamic"
export const metadata = { icons: ORGANIZER_ICONS }
export const fetchCache = "force-no-store"

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="scanner" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
