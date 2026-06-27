import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getMyContexts } from "@/lib/data/identity/contexts"
import { getActiveContextKey, pickLanding } from "@/lib/identity/context"

export const dynamic = "force-dynamic"

/**
 * Smart landing entry point. Sends the user to the right context per the rules in
 * pickLanding (last-used → that context; only Door role → Scan; otherwise
 * Personal). Wire as the post-login destination to honour "returning → last
 * context".
 */
export default async function LaunchPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [contexts, lastKey] = await Promise.all([getMyContexts(), getActiveContextKey()])
  redirect(pickLanding(contexts, lastKey))
}
