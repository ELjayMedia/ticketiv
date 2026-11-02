import { listMobileWorkspaces } from "@/lib/mobile/organizer"
import { withMobileOrganizerUser } from "@/lib/mobile/organizer-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/mobile/organizer/workspaces — the signed-in person's organisations and role in each. */
export async function GET(request: Request) {
  return withMobileOrganizerUser(request, async (user) => ({
    user: { id: user.id, email: user.email ?? null },
    workspaces: await listMobileWorkspaces(user.id),
  }))
}
