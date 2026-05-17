"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createOrgSeries,
  updateOrgSeries,
  checkSeriesSlugAvailable,
  deleteOrgSeries,
  generateSeriesEvents,
} from "@/lib/data/organizer/series"
import { seriesFormSchema, type SeriesFormValues } from "@/lib/series/schema"

async function assertOrgMember(orgId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!membership) return { ok: false, error: "Not a member of this organization." }
  return { ok: true }
}

export async function createSeriesAction(
  orgId: string,
  values: SeriesFormValues,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const parsed = seriesFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const auth = await assertOrgMember(orgId)
  if (!auth.ok) return auth

  const result = await createOrgSeries(orgId, parsed.data)
  if (result.ok) {
    revalidatePath(`/orgs/${orgId}/series`)
  }
  return result
}

export async function updateSeriesAction(
  orgId: string,
  seriesId: string,
  values: SeriesFormValues,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const parsed = seriesFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const auth = await assertOrgMember(orgId)
  if (!auth.ok) return auth

  const result = await updateOrgSeries(orgId, seriesId, parsed.data)
  if (result.ok) {
    revalidatePath(`/orgs/${orgId}/series`)
    revalidatePath(`/orgs/${orgId}/series/${result.slug}`)
    revalidatePath(`/series/${result.slug}`)
  }
  return result
}

export async function checkSlugAvailableAction(
  slug: string,
  ignoreId?: string,
): Promise<boolean> {
  return checkSeriesSlugAvailable(slug, ignoreId)
}

export async function deleteSeriesAction(
  orgId: string,
  seriesId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertOrgMember(orgId)
  if (!auth.ok) return auth

  const result = await deleteOrgSeries(orgId, seriesId)
  if (result.ok) {
    revalidatePath(`/orgs/${orgId}/series`)
  }
  return result
}

export async function generateSeriesEventsAction(
  orgId: string,
  seriesId: string,
  count: number,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const auth = await assertOrgMember(orgId)
  if (!auth.ok) return auth

  if (!Number.isInteger(count) || count < 1 || count > 52) {
    return { ok: false, error: "Choose between 1 and 52 events." }
  }

  const result = await generateSeriesEvents(orgId, seriesId, count)
  if (result.ok) {
    revalidatePath(`/orgs/${orgId}/series`)
  }
  return result
}
