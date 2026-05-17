import "server-only"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Resolves the signed-in user's organization and redirects to an org-scoped
 * route. Used by legacy alias routes (`/create`, `/dashboard`, `/finance`, …)
 * that have no `orgId` in scope.
 *
 * A temporary redirect is intentional: the target is user-specific, so a
 * permanent (308) redirect could be cached by the browser and send a
 * different user to the wrong org.
 */
export async function redirectToOrgScopedRoute(
  buildPath: (orgId: string) => string,
): Promise<never> {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", session.user.id)

  const orgIds = (memberships ?? []).map((m) => m.org_id).filter(Boolean)

  if (orgIds.length === 0) redirect("/onboarding/organizer")

  // No org picker route exists yet, so a user in multiple orgs lands in their
  // first org. Replace with an org picker once one is built.
  redirect(buildPath(orgIds[0]))
}
