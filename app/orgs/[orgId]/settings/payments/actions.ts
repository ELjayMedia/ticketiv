"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { parsePaymentProviderList } from "@/lib/payments/availability-core"

export type OrgPaymentsResult = { ok: boolean; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Save the organisation's default payment methods (TICK-394). fn_set_org_payment_providers re-checks the role. */
export async function saveOrgPaymentProvidersAction(_prev: OrgPaymentsResult | null, formData: FormData): Promise<OrgPaymentsResult> {
  const orgId = String(formData.get("orgId") ?? "")
  if (!UUID.test(orgId)) return { ok: false, message: "That organisation no longer exists." }
  const mode = String(formData.get("mode") ?? "all")
  const chosen = mode === "custom" ? formData.getAll("providers").map(String) : []
  const parsed = parsePaymentProviderList(chosen)
  if (!parsed.ok) return { ok: false, message: parsed.error }
  if (mode === "custom" && parsed.providers.length === 0) return { ok: false, message: "Choose at least one payment method, or allow all available methods." }

  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { error } = await supabase.rpc("fn_set_org_payment_providers", { p_org_id: orgId, p_providers: parsed.providers })
  if (error) {
    const msg = String(error.message ?? "")
    return { ok: false, message: msg.includes("forbidden") ? "Only owners and admins can change payment methods." : "Couldn't save. Please try again." }
  }
  revalidatePath(`/orgs/${orgId}/settings/payments`)
  return { ok: true, message: "Saved. New checkouts use these methods; completed payments are unchanged." }
}
