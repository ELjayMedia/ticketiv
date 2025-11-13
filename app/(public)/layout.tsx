import type React from "react"

import { WorkspaceShell } from "@/components/ui/workspace-shell"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell workspace="public">{children}</WorkspaceShell>
}
