import type { ReactNode } from "react"

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell"

// The super-admin area uses the Supabase service-role client and must never
// be statically prerendered at build time (admin env vars are request-only).
export const dynamic = "force-dynamic"

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <SuperAdminShell>{children}</SuperAdminShell>
}
