"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"

export const PROVIDER_READINESS_CHECKLIST = [
  { key: "merchant_arrangement", label: "Merchant arrangement / acquiring agreement" },
  { key: "kyb", label: "KYB / merchant onboarding complete" },
  { key: "production_credentials", label: "Production credentials provisioned" },
  { key: "callback_configuration", label: "Callback / webhook configuration verified" },
  { key: "uat", label: "Provider-specific UAT evidence" },
  { key: "data_protection", label: "Data protection / processor terms cleared" },
  { key: "card_validation", label: "Card / payment-method validation complete" },
  { key: "settlement_refund", label: "Settlement and refund procedure documented" },
] as const

const SUPPORTED_PROVIDERS = new Set(["paystack", "momo", "deltapay"])

type EvidenceItem = {
  key: string
  label: string
  ref: string
}

function assertProvider(provider: string) {
  if (!SUPPORTED_PROVIDERS.has(provider)) throw new Error("Unsupported payment provider")
}

function parseEvidence(formData: FormData): EvidenceItem[] {
  return PROVIDER_READINESS_CHECKLIST.flatMap(({ key, label }) => {
    const ref = formData.get(`evidence_${key}`)?.toString().trim()
    return ref ? [{ key, label, ref }] : []
  })
}

function missingEvidence(evidence: EvidenceItem[]) {
  const present = new Set(evidence.map((item) => item.key))
  return PROVIDER_READINESS_CHECKLIST.filter((item) => !present.has(item.key))
}

async function auditReadinessChange(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  provider: string,
  businessAction: string,
  details: Record<string, unknown>,
) {
  const { error } = await admin.from("audit_log").insert({
    org_id: null,
    actor_id: actorId,
    table_name: "payment_provider_readiness",
    record_id: provider,
    action: "update",
    changes: {
      business_action: businessAction,
      provider,
      ...details,
    },
  })

  if (error) throw new Error(`Readiness changed but audit logging failed: ${error.message}`)
}

export async function saveProviderReadinessEvidenceAction(provider: string, formData: FormData) {
  assertProvider(provider)
  const { user } = await requireAdminRole(["super_admin"])
  const evidence = parseEvidence(formData)
  const admin = createAdminClient()

  const { data: current, error: readError } = await admin
    .from("payment_provider_readiness" as any)
    .select("production_ready, evidence_refs")
    .eq("provider", provider)
    .maybeSingle()

  if (readError) throw new Error(readError.message)
  if (!current) throw new Error("Provider readiness row not found")
  if ((current as any).production_ready) {
    throw new Error("Revoke production readiness before changing approval evidence")
  }

  const { error } = await admin
    .from("payment_provider_readiness" as any)
    .update({ evidence_refs: evidence, updated_at: new Date().toISOString() } as any)
    .eq("provider", provider)

  if (error) throw new Error(error.message)

  await auditReadinessChange(admin, user.id, provider, "save_provider_readiness_evidence", {
    evidence_keys: evidence.map((item) => item.key),
    missing_keys: missingEvidence(evidence).map((item) => item.key),
  })

  revalidatePath("/super-admin/provider-readiness")
}

export async function approveProviderProductionReadinessAction(provider: string) {
  assertProvider(provider)
  const { user } = await requireAdminRole(["super_admin"])
  const admin = createAdminClient()

  const { data: current, error: readError } = await admin
    .from("payment_provider_readiness" as any)
    .select("production_ready, evidence_refs, blocked_at, blocked_reason")
    .eq("provider", provider)
    .maybeSingle()

  if (readError) throw new Error(readError.message)
  if (!current) throw new Error("Provider readiness row not found")

  const evidence = Array.isArray((current as any).evidence_refs)
    ? ((current as any).evidence_refs as EvidenceItem[])
    : []
  const missing = missingEvidence(evidence)
  if (missing.length > 0) {
    throw new Error(`Cannot approve: missing ${missing.map((item) => item.label).join(", ")}`)
  }

  const approvedAt = new Date().toISOString()
  const { error } = await admin
    .from("payment_provider_readiness" as any)
    .update({
      production_ready: true,
      approved_at: approvedAt,
      approved_by: user.id,
      blocked_at: null,
      blocked_reason: null,
      updated_at: approvedAt,
    } as any)
    .eq("provider", provider)

  if (error) throw new Error(error.message)

  await auditReadinessChange(admin, user.id, provider, "approve_provider_production_readiness", {
    approved_at: approvedAt,
    evidence_keys: evidence.map((item) => item.key),
    previous_production_ready: Boolean((current as any).production_ready),
  })

  revalidatePath("/super-admin/provider-readiness")
}

export async function revokeProviderProductionReadinessAction(provider: string, formData: FormData) {
  assertProvider(provider)
  const { user } = await requireAdminRole(["super_admin"])
  const reason = formData.get("reason")?.toString().trim()
  if (!reason) throw new Error("A revocation reason is required")

  const admin = createAdminClient()
  const blockedAt = new Date().toISOString()
  const { error } = await admin
    .from("payment_provider_readiness" as any)
    .update({
      production_ready: false,
      approved_at: null,
      approved_by: null,
      blocked_at: blockedAt,
      blocked_reason: reason,
      updated_at: blockedAt,
    } as any)
    .eq("provider", provider)

  if (error) throw new Error(error.message)

  await auditReadinessChange(admin, user.id, provider, "revoke_provider_production_readiness", {
    reason,
    blocked_at: blockedAt,
  })

  revalidatePath("/super-admin/provider-readiness")
}

export async function emergencyDisableProviderAction(provider: string) {
  assertProvider(provider)
  const { user } = await requireAdminRole(["super_admin"])
  const admin = createAdminClient()
  const blockedAt = new Date().toISOString()
  const reason = "Emergency disable by Ticketiv super admin"

  const { error: readinessError } = await admin
    .from("payment_provider_readiness" as any)
    .update({
      production_ready: false,
      approved_at: null,
      approved_by: null,
      blocked_at: blockedAt,
      blocked_reason: reason,
      updated_at: blockedAt,
    } as any)
    .eq("provider", provider)

  if (readinessError) throw new Error(readinessError.message)

  // Also disable ordinary routing availability so the kill action is immediate
  // even outside production-readiness checks. Test mode can be re-enabled later
  // through normal provider controls after the incident is understood.
  const { error: settingsError } = await admin
    .from("payment_provider_settings")
    .update({ is_enabled: false, updated_by: user.id, updated_at: blockedAt })
    .eq("provider", provider)

  if (settingsError) throw new Error(settingsError.message)

  await auditReadinessChange(admin, user.id, provider, "emergency_disable_provider", {
    reason,
    blocked_at: blockedAt,
    routing_enabled: false,
  })

  revalidatePath("/super-admin/provider-readiness")
}
