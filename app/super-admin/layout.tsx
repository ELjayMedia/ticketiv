import type { ReactNode } from "react"

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"

// The super-admin area uses the Supabase service-role client and must never
// be statically prerendered at build time (admin env vars are request-only).
export const dynamic = "force-dynamic"

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin()
  const context = await getAdminContext()
  return (
    <SuperAdminShell
      userEmail={user.email}
      role={context?.role ?? null}
      // Server-only check of the key prefix; the key itself never leaves the server.
      paymentsTestMode={(process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_")}
    >
      {children}
    </SuperAdminShell>
  )
}
