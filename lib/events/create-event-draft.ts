export const NEW_EVENT_START_FIELDS = ["title"] as const

export type CreateEventDraftParams = {
  p_org_id: string
  p_title: string
  p_visibility: "private"
}

export function normalizeEventTitle(value: string) {
  return value.trim()
}

export function buildCreateEventDraftParams(orgId: string, title: string): CreateEventDraftParams {
  const normalizedTitle = normalizeEventTitle(title)

  if (!normalizedTitle) {
    throw new Error("Event name is required")
  }

  return {
    p_org_id: orgId,
    p_title: normalizedTitle,
    p_visibility: "private",
  }
}
