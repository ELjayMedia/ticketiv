"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Shield } from "lucide-react"

interface NoAccessEmptyStateProps {
  title?: string
  description?: string
  resource?: string
  showBackButton?: boolean
  showOrgSwitch?: boolean
}

/**
 * Friendly empty state shown when user doesn't have access to a resource
 * Usually due to RLS filtering or permission checks
 */
export function NoAccessEmptyState({
  title = "No Access",
  description = "You don't have permission to view this resource.",
  resource = "resource",
  showBackButton = true,
  showOrgSwitch = false,
}: NoAccessEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="bg-muted p-4 rounded-lg flex gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
          <div className="text-left text-muted-foreground space-y-1">
            <p>This {resource} might be:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only visible to organization members</li>
              <li>Assigned to specific event staff</li>
              <li>Restricted to administrators</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          {showBackButton && (
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Link>
            </Button>
          )}
          {showOrgSwitch && (
            <Button asChild>
              <Link href="/dashboard">Switch Organization</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
