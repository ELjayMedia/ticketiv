import type { AdminResource, AdminResourceField } from "@/lib/super-admin/resources"

export type AdminResourceSearchParams = Record<string, string | string[] | undefined>

function parseFieldValue(field: AdminResourceField, formData: FormData) {
  if (field.readonly || field.type === "readonly") return undefined

  const raw = formData.get(field.name)

  if (field.type === "boolean") {
    return raw === "on" || raw === "true"
  }

  if (raw === null) return null

  const value = String(raw).trim()

  if (!value) {
    return field.required ? value : null
  }

  if (field.type === "number") return Number(value)
  if (field.type === "datetime") return new Date(value).toISOString()

  if (field.type === "json") {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }

  return value
}

export function buildAdminPayload(resource: AdminResource, formData: FormData) {
  const payload: Record<string, unknown> = {}

  for (const field of resource.fields) {
    const value = parseFieldValue(field, formData)
    if (value !== undefined) payload[field.name] = value
  }

  return payload
}

export function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function buildAdminCreateDefaults(resource: AdminResource, searchParams: AdminResourceSearchParams) {
  const defaults: Record<string, string> = {}

  for (const field of resource.fields) {
    if (field.readonly || field.type === "readonly") continue

    const value = firstSearchParam(searchParams[field.name])?.trim()
    if (value) defaults[field.name] = value
  }

  return defaults
}
