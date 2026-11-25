import { redirect } from "next/navigation"

// The flag cards live at /super-admin/feature-flags (the sidebar's link).
export default function SuperAdminFlagsRedirect() {
  redirect("/super-admin/feature-flags")
}
