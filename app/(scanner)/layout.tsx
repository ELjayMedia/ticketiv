import type React from "react"

import { WorkspaceShell } from "@/components/ui/workspace-shell"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="scanner" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
