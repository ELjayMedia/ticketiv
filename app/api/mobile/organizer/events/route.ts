import { listMobileScanEvents, MobileOrganizerError } from "@/lib/mobile/organizer"
import { withMobileOrganizerUser } from "@/lib/mobile/organizer-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/mobile/organizer/events?orgId= — events the signed-in person can scan. */
export async function GET(request: Request) {
  return withMobileOrganizerUser(request, async (user) => {
    const orgId = new URL(request.url).searchParams.get("orgId")
    if (!orgId) throw new MobileOrganizerError("orgId is required", 400)
    return { events: await listMobileScanEvents(user.id, orgId) }
  })
}
