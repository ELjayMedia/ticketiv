"use client"

import { usePermissions } from "@/lib/providers/permissions-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, Check, Plus } from "lucide-react"
import Link from "next/link"

export function OrgSwitcher() {
  const { permissions, activeOrgId, setActiveOrgId } = usePermissions()

  if (!permissions || permissions.orgMemberships.length === 0) {
    return null
  }

  const currentOrg = permissions.orgMemberships.find((m) => m.org_id === activeOrgId)
  const orgName = currentOrg?.name || activeOrgId?.substring(0, 8) || "Organization"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[120px] truncate">{orgName}</span>
          <span className="sm:hidden">{orgName.substring(0, 1)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {permissions.orgMemberships.map((membership) => (
          <DropdownMenuItem
            key={membership.org_id}
            onClick={() => setActiveOrgId(membership.org_id)}
            className="cursor-pointer gap-2"
          >
            <Check
              className="h-4 w-4"
              style={{
                opacity: activeOrgId === membership.org_id ? 1 : 0,
              }}
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{membership.name || membership.org_id}</div>
              <div className="text-xs text-muted-foreground capitalize">{membership.role}</div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/orgs/new" className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
