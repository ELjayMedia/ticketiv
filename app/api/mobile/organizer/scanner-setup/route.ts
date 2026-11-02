import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { issueMobileScannerSetup, MobileOrganizerError } from "@/lib/mobile/organizer"
import { withMobileOrganizerUser } from "@/lib/mobile/organizer-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/mobile/organizer/scanner-setup { orgId, eventId, deviceId?, label? }
 * Pairs the signed-in person's phone as a scanner for an event they may scan.
 */
export async function POST(request: Request) {
  const rl = await rateLimit("mobile:scanner-setup", clientKey(request), 10, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  return withMobileOrganizerUser(
    request,
    async (signedIn) => {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      const orgId = typeof body.orgId === "string" ? body.orgId : ""
      const eventId = typeof body.eventId === "string" ? body.eventId : ""
      if (!orgId || !eventId) throw new MobileOrganizerError("orgId and eventId are required", 400)
      return issueMobileScannerSetup({
        userId: signedIn.id,
        orgId,
        eventId,
        deviceId: typeof body.deviceId === "string" ? body.deviceId : null,
        label: typeof body.label === "string" ? body.label : null,
      })
    },
    201,
  )
}
