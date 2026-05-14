import { createServerSupabaseClient } from "@/lib/supabase-server"

export type EventCategoryOption = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
}

export async function getActiveEventCategories(): Promise<EventCategoryOption[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("event_categories")
    .select("id, name, slug, description, icon, color, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("[event-categories] Failed to load categories:", error.message)
    return []
  }

  return (data ?? []) as EventCategoryOption[]
}
