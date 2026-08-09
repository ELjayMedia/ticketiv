import type React from "react"

import { WorkspaceShell } from "@/components/quiet/shell/workspace-shell"

export default function AppWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="app" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
