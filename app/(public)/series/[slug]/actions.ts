"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function toggleSeriesFollow(
  seriesId: string,
  seriesSlug: string,
  follow: boolean,
): Promise<{ ok: true; following: boolean } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Sign in to follow this series." }
  }

  if (follow) {
    const { error } = await supabase
      .from("series_follows")
      .insert({ user_id: user.id, series_id: seriesId })
    // Ignore unique-violation: an existing follow already satisfies the request.
    if (error && !error.message.includes("23505") && !error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from("series_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", seriesId)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath(`/series/${seriesSlug}`)
  return { ok: true, following: follow }
}
