import type React from "react"

import { WorkspaceShell } from "@/components/ui/workspace-shell"

export default function AppWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="app" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
