import { createPublicSupabaseClient } from "@/lib/supabase-public"

export async function getOrganizerRating(orgId: string | null | undefined) {
  const client = createPublicSupabaseClient()
  if (!client || !orgId) return null
  const { data, error } = await client.rpc("fn_org_rating", { p_org_id: orgId })
  if (error) console.error("[event-reviews] organiser rating", error.code)
  return data as { average: number | null; count: number } | null
}
