"use client"

import type React from "react"
import { MobileShell } from "@/components/ui/mobile-shell"
import { DesktopShell } from "@/components/ui/desktop-shell"
import { OfflineBanner } from "@/components/ui/offline-banner"
import { Toaster } from "@/components/ui/toaster"

interface AppShellProps {
  children: React.ReactNode
  user?: { email?: string }
  workspace?: "public" | "app" | "organizer" | "scanner"
  onLogout?: () => void
}

export function AppShell({ children, user, workspace = "public", onLogout }: AppShellProps) {
  return (
    <>
      <OfflineBanner />

      {/* Mobile shell (< lg) */}
      <MobileShell user={user} workspace={workspace}>
        {children}
      </MobileShell>

      {/* Desktop shell (lg+) */}
      <DesktopShell user={user} workspace={workspace} onLogout={onLogout}>
        {children}
      </DesktopShell>

      <Toaster />
    </>
  )
}
