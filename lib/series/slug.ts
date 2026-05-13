import type { SupabaseClient } from "@supabase/supabase-js"

export function generateSeriesSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export async function findAvailableSeriesSlug(
  supabase: SupabaseClient,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const root = generateSeriesSlug(base) || "series"
  let candidate = root
  let suffix = 1

  while (true) {
    let query = supabase.from("event_series").select("id").eq("slug", candidate).limit(1)
    if (ignoreId) {
      query = query.neq("id", ignoreId)
    }
    const { data } = await query
    if (!data || data.length === 0) return candidate
    suffix += 1
    candidate = `${root}-${suffix}`.slice(0, 80)
  }
}
