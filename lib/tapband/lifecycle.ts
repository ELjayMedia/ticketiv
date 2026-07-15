import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

export type TapBandLifecycleMetadata = Record<string, Json>

export interface TapBandLifecycleDeviceContext {
  deviceId?: string | null
  sessionId?: string | null
  attemptId?: string | null
}

export interface IssueTapBandCredentialInput extends TapBandLifecycleDeviceContext {
  inventoryId: string
  userId: string
  credentialPublicId: string
  actorId: string
  metadata?: TapBandLifecycleMetadata | null
}

export interface ActivateTapBandCredentialInput extends TapBandLifecycleDeviceContext {
  credentialId: string
  actorId: string
  verificationMetadata?: TapBandLifecycleMetadata | null
}

export interface AssignTapBandEntitlementInput {
  credentialId: string
  orderItemId: string
  eventId: string
  actorId: string
  assignmentSource?: string | null
  attemptId?: string | null
  metadata?: TapBandLifecycleMetadata | null
}

export interface RevokeTapBandCredentialInput {
  credentialId: string
  actorId: string
  reason: string
  newStatus?: string | null
  attemptId?: string | null
  metadata?: TapBandLifecycleMetadata | null
}

export interface ReplaceTapBandCredentialInput {
  oldCredentialId: string
  newInventoryId: string
  newCredentialPublicId: string
  actorId: string
  attemptId?: string | null
  metadata?: TapBandLifecycleMetadata | null
}

export interface ResolveTapBandCredentialInput extends TapBandLifecycleDeviceContext {
  credentialPublicId: string
  eventId: string
  actorId: string
}

export interface ListTapBandCustomerCredentialsInput {
  userId: string
}

export interface TapBandLifecycleResult {
  ok: boolean
  valid?: boolean
  status?: string | null
  outcome?: string | null
  reasonCode?: string | null
  message?: string | null
  credentialId?: string | null
  credentialPublicId?: string | null
  inventoryId?: string | null
  entitlementId?: string | null
  orderItemId?: string | null
  eventId?: string | null
  userId?: string | null
  ticketTypeName?: string | null
  replacementOfId?: string | null
  replacedById?: string | null
  checkedInAt?: string | null
  idempotent?: boolean
  raw: Record<string, unknown>
}

export interface TapBandCustomerCredential {
  credentialId: string
  credentialPublicId: string
  inventoryId: string
  status: string
  credentialType: string
  chipFamily: string
  keyVersion: string | null
  issuedAt: string | null
  activatedAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  replacementOfId: string | null
  replacedById: string | null
  raw: Record<string, unknown>
}

interface TapBandLifecycleClient {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

const RESULT_KEY_MAP = {
  reason_code: "reasonCode",
  credential_id: "credentialId",
  credential_public_id: "credentialPublicId",
  inventory_id: "inventoryId",
  entitlement_id: "entitlementId",
  order_item_id: "orderItemId",
  event_id: "eventId",
  user_id: "userId",
  ticket_type_name: "ticketTypeName",
  replacement_of_id: "replacementOfId",
  replaced_by_id: "replacedById",
  checked_in_at: "checkedInAt",
} as const

const CUSTOMER_CREDENTIAL_KEY_MAP = {
  credential_id: "credentialId",
  credential_public_id: "credentialPublicId",
  inventory_id: "inventoryId",
  credential_type: "credentialType",
  chip_family: "chipFamily",
  key_version: "keyVersion",
  issued_at: "issuedAt",
  activated_at: "activatedAt",
  last_used_at: "lastUsedAt",
  revoked_at: "revokedAt",
  replacement_of_id: "replacementOfId",
  replaced_by_id: "replacedById",
} as const

export class TapBandLifecycleError extends Error {
  readonly status: number
  readonly reasonCode: string
  readonly result: TapBandLifecycleResult

  constructor(result: TapBandLifecycleResult, status = tapBandLifecycleHttpStatus(result.reasonCode)) {
    super(result.message ?? result.reasonCode ?? "TapBand lifecycle request failed")
    this.name = "TapBandLifecycleError"
    this.status = status
    this.reasonCode = result.reasonCode ?? "tapband_lifecycle_failed"
    this.result = result
  }
}

export function createTapBandLifecycleService(
  client: TapBandLifecycleClient = createAdminClient() as unknown as TapBandLifecycleClient,
) {
  return {
    issueCredential(input: IssueTapBandCredentialInput) {
      return callLifecycleRpc(client, "fn_tapband_issue_credential", {
        p_inventory_id: input.inventoryId,
        p_user_id: input.userId,
        p_credential_public_id: input.credentialPublicId,
        p_actor_id: input.actorId,
        p_device_id: input.deviceId ?? null,
        p_session_id: input.sessionId ?? null,
        p_attempt_id: input.attemptId ?? null,
        p_metadata: input.metadata ?? {},
      })
    },

    activateCredential(input: ActivateTapBandCredentialInput) {
      return callLifecycleRpc(client, "fn_tapband_activate_credential", {
        p_credential_id: input.credentialId,
        p_actor_id: input.actorId,
        p_device_id: input.deviceId ?? null,
        p_session_id: input.sessionId ?? null,
        p_attempt_id: input.attemptId ?? null,
        p_verification_metadata: input.verificationMetadata ?? {},
      })
    },

    assignEntitlement(input: AssignTapBandEntitlementInput) {
      return callLifecycleRpc(client, "fn_tapband_assign_entitlement", {
        p_credential_id: input.credentialId,
        p_order_item_id: input.orderItemId,
        p_event_id: input.eventId,
        p_actor_id: input.actorId,
        p_assignment_source: input.assignmentSource ?? "support",
        p_attempt_id: input.attemptId ?? null,
        p_metadata: input.metadata ?? {},
      })
    },

    revokeCredential(input: RevokeTapBandCredentialInput) {
      return callLifecycleRpc(client, "fn_tapband_revoke_credential", {
        p_credential_id: input.credentialId,
        p_actor_id: input.actorId,
        p_reason: input.reason,
        p_new_status: input.newStatus ?? "revoked",
        p_attempt_id: input.attemptId ?? null,
        p_metadata: input.metadata ?? {},
      })
    },

    replaceCredential(input: ReplaceTapBandCredentialInput) {
      return callLifecycleRpc(client, "fn_tapband_replace_credential", {
        p_old_credential_id: input.oldCredentialId,
        p_new_inventory_id: input.newInventoryId,
        p_new_credential_public_id: input.newCredentialPublicId,
        p_actor_id: input.actorId,
        p_attempt_id: input.attemptId ?? null,
        p_metadata: input.metadata ?? {},
      })
    },

    resolveCredentialForEvent(input: ResolveTapBandCredentialInput) {
      return callLifecycleRpc(client, "fn_tapband_resolve_credential_for_event", {
        p_credential_public_id: input.credentialPublicId,
        p_event_id: input.eventId,
        p_actor_id: input.actorId,
        p_device_id: input.deviceId ?? null,
        p_session_id: input.sessionId ?? null,
        p_attempt_id: input.attemptId ?? null,
      })
    },

    async listCustomerCredentials(input: ListTapBandCustomerCredentialsInput) {
      const { data, error } = await rpc(client, "fn_tapband_customer_credentials", {
        p_user_id: input.userId,
      })

      if (error) {
        throw new TapBandLifecycleError(rpcErrorResult(error.message), 500)
      }

      return normalizeTapBandCustomerCredentials(data)
    },
  }
}

export function assertTapBandLifecycleOk(result: TapBandLifecycleResult) {
  if (!result.ok) {
    throw new TapBandLifecycleError(result)
  }

  return result
}

export function tapBandLifecycleHttpStatus(reasonCode: string | null | undefined) {
  if (!reasonCode) return 400

  if (reasonCode.includes("unauthorized")) return 403
  if (reasonCode.includes("not_found") || reasonCode === "tapband_unknown") return 404
  if (
    reasonCode.includes("conflict") ||
    reasonCode.includes("duplicate") ||
    reasonCode.includes("already_issued") ||
    reasonCode.includes("already_used") ||
    reasonCode.includes("attempt_conflict")
  ) {
    return 409
  }

  if (
    reasonCode.includes("invalid") ||
    reasonCode.includes("inactive") ||
    reasonCode.includes("not_available") ||
    reasonCode.includes("wrong_event") ||
    reasonCode.includes("no_entitlement") ||
    reasonCode.includes("not_paid") ||
    reasonCode.includes("revoked") ||
    reasonCode.includes("refunded") ||
    reasonCode.includes("lost") ||
    reasonCode.includes("defective") ||
    reasonCode.includes("retired") ||
    reasonCode.includes("destroyed") ||
    reasonCode.includes("replaced")
  ) {
    return 422
  }

  return 400
}

export function normalizeTapBandLifecycleResult(raw: unknown): TapBandLifecycleResult {
  const source = asRecord(raw)
  const normalized: Record<string, unknown> = { ...source }

  for (const [from, to] of Object.entries(RESULT_KEY_MAP)) {
    if (from in source && !(to in normalized)) {
      normalized[to] = source[from]
    }
  }

  return {
    ok: normalized.ok === true,
    valid: asOptionalBoolean(normalized.valid),
    status: asOptionalString(normalized.status),
    outcome: asOptionalString(normalized.outcome),
    reasonCode: asOptionalString(normalized.reasonCode),
    message: asOptionalString(normalized.message),
    credentialId: asOptionalString(normalized.credentialId),
    credentialPublicId: asOptionalString(normalized.credentialPublicId),
    inventoryId: asOptionalString(normalized.inventoryId),
    entitlementId: asOptionalString(normalized.entitlementId),
    orderItemId: asOptionalString(normalized.orderItemId),
    eventId: asOptionalString(normalized.eventId),
    userId: asOptionalString(normalized.userId),
    ticketTypeName: asOptionalString(normalized.ticketTypeName),
    replacementOfId: asOptionalString(normalized.replacementOfId),
    replacedById: asOptionalString(normalized.replacedById),
    checkedInAt: asOptionalString(normalized.checkedInAt),
    idempotent: asOptionalBoolean(normalized.idempotent),
    raw: source,
  }
}

export function normalizeTapBandCustomerCredentials(raw: unknown): TapBandCustomerCredential[] {
  if (!Array.isArray(raw)) return []

  return raw.map(normalizeTapBandCustomerCredential).filter((credential): credential is TapBandCustomerCredential =>
    Boolean(credential),
  )
}

async function callLifecycleRpc(
  client: TapBandLifecycleClient,
  functionName: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await rpc(client, functionName, args)

  if (error) {
    throw new TapBandLifecycleError(rpcErrorResult(error.message), 500)
  }

  return normalizeTapBandLifecycleResult(data)
}

function normalizeTapBandCustomerCredential(raw: unknown): TapBandCustomerCredential | null {
  const source = asRecord(raw)
  if (!source.credential_id && !source.credentialId) return null

  const normalized: Record<string, unknown> = { ...source }
  for (const [from, to] of Object.entries(CUSTOMER_CREDENTIAL_KEY_MAP)) {
    if (from in source && !(to in normalized)) {
      normalized[to] = source[from]
    }
  }

  return {
    credentialId: asRequiredString(normalized.credentialId),
    credentialPublicId: asRequiredString(normalized.credentialPublicId),
    inventoryId: asRequiredString(normalized.inventoryId),
    status: asRequiredString(normalized.status),
    credentialType: asRequiredString(normalized.credentialType),
    chipFamily: asRequiredString(normalized.chipFamily),
    keyVersion: asOptionalString(normalized.keyVersion),
    issuedAt: asOptionalString(normalized.issuedAt),
    activatedAt: asOptionalString(normalized.activatedAt),
    lastUsedAt: asOptionalString(normalized.lastUsedAt),
    revokedAt: asOptionalString(normalized.revokedAt),
    replacementOfId: asOptionalString(normalized.replacementOfId),
    replacedById: asOptionalString(normalized.replacedById),
    raw: source,
  }
}

function rpc(client: TapBandLifecycleClient, functionName: string, args: Record<string, unknown>) {
  return client.rpc(functionName, args)
}

function rpcErrorResult(message: string): TapBandLifecycleResult {
  return {
    ok: false,
    reasonCode: "tapband_rpc_error",
    message: `Unable to run TapBand lifecycle RPC: ${message}`,
    raw: { message },
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : value == null ? null : String(value)
}

function asRequiredString(value: unknown) {
  return asOptionalString(value) ?? ""
}

function asOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}
