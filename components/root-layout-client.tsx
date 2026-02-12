"use client"

import React from "react"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { NotificationsProvider } from "@/lib/providers/notifications-provider"
import { Toaster } from "@/components/ui/toaster"

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const { userId } = usePermissions()

  return (
    <NotificationsProvider userId={userId || undefined}>
      {children}
      <Toaster />
    </NotificationsProvider>
  )
}
