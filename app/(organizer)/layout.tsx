import type React from "react"

import { WorkspaceShell } from "@/components/ui/workspace-shell"

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell workspace="organizer" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
