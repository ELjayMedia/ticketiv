import { createPublicSupabaseClient } from "@/lib/supabase-public"
import { validateSchema, EventsPublicViewSchema, EventPublicViewSchema, type EventsPublicView, type EventPublicView } from "@/lib/schemas/views"

export async function getPublicEventsList(params?: {
  limit?: number
  offset?: number
  city?: string
  category?: string
  search?: string
  startsAfter?: string
  sort?: "soonest" | "latest" | "price_low" | "price_high"
}): Promise<EventsPublicView[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("v_public_event_cards").select("*")

    if (params?.city) {
      query = query.ilike("city", `%${params.city}%`)
    }

    if (params?.category) {
      query = query.eq("category", params.category)
    }

    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`)
    }

    if (params?.startsAfter) {
      query = query.gte("starts_at", params.startsAfter)
    }

    const orderColumn = params?.sort === "price_low" ? "min_price_cents" : 
                        params?.sort === "price_high" ? "max_price_cents" :
                        params?.sort === "latest" ? "starts_at" : "starts_at"
    const ascending = params?.sort === "price_high" || params?.sort === "latest" ? false : true

    query = query.order(orderColumn, { ascending })

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error(
        `[v0] Error fetching public events from v_public_event_cards — ${error.code ?? "no-code"}: ${error.message ?? "unknown"}${error.hint ? ` (hint: ${error.hint})` : ""}`,
      )
      return []
    }

    if (!data) return []
    return data
      .map((item) => validateSchema(EventsPublicViewSchema, item, "v_public_event_cards"))
      .filter((row): row is EventsPublicView => row != null)
  } catch (error) {
    console.error("[v0] Exception in getPublicEventsList:", error)
    return []
  }
}

export async function getPublicEventBySlug(slug: string): Promise<EventPublicView | null> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("v_event_public")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching event by slug:", error)
      return null
    }

    if (!data) return null
    return validateSchema(EventPublicViewSchema, data, "v_event_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicEventBySlug:", error)
    return null
  }
}
