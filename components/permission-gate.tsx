"use client"

import React from "react"

import { ReactNode } from "react"
import { useCanAccess } from "@/lib/providers/permissions-provider"

interface PermissionGateProps {
  action: string
  scope?: { orgId?: string; eventId?: string }
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component wrapper that shows children only if user has permission
 */
export function PermissionGate({
  action,
  scope,
  children,
  fallback = null,
}: PermissionGateProps) {
  const canAccess = useCanAccess(action, scope)

  if (!canAccess) {
    return fallback
  }

  return children
}

interface PermissionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: string
  scope?: { orgId?: string; eventId?: string }
  children: ReactNode
}

/**
 * Button that's hidden if user doesn't have permission
 */
export function PermissionButton({
  action,
  scope,
  children,
  disabled,
  ...props
}: PermissionButtonProps) {
  const canAccess = useCanAccess(action, scope)

  return (
    <button disabled={!canAccess || disabled} {...props}>
      {children}
    </button>
  )
}

interface PermissionTabProps {
  action: string
  scope?: { orgId?: string; eventId?: string }
  children: ReactNode
}

/**
 * Tab that's hidden if user doesn't have permission
 */
export function PermissionTab({
  action,
  scope,
  children,
}: PermissionTabProps) {
  const canAccess = useCanAccess(action, scope)

  if (!canAccess) {
    return null
  }

  return children
}
