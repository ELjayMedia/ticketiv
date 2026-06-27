import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AcceptInvite } from "./accept-invite"

export const dynamic = "force-dynamic"
export const metadata = { title: "Accept invite" }

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Bots/previewers and signed-out users never auto-consume the token: send them
  // to sign in and back. Acceptance only happens via the POST action.
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/${token}`)}`)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AcceptInvite token={token} />
    </main>
  )
}
