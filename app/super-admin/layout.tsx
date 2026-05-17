import type { ReactNode } from "react"

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

// The super-admin area uses the Supabase service-role client and must never
// be statically prerendered at build time (admin env vars are request-only).
export const dynamic = "force-dynamic"

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin()
  return <SuperAdminShell userEmail={user.email}>{children}</SuperAdminShell>
}
