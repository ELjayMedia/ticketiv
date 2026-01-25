"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useNotifications } from "@/hooks/use-notifications"

type NotificationsContextType = {
  userId?: string
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
)

export function NotificationsProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId?: string
}) {
  // Initialize notifications listening
  useNotifications({ userId })

  return (
    <NotificationsContext.Provider value={{ userId }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error(
      "useNotificationsContext must be used within NotificationsProvider"
    )
  }
  return context
}
