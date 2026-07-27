import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { getMyOrgCapabilities } from "@/lib/data/organizer/access"
import { NewEventForm } from "./new-event-form"

export const metadata = { title: "Create event" }
export const dynamic = "force-dynamic"

// Server-gated: this page previously relied on usePermissions(), whose
// PermissionsProvider was never mounted — the client threw on every render
// and event creation was unreachable. Role gating now happens server-side
// via getMyOrgCapabilities (TICK-277), same as the org dashboard; the RPC
// (create_event_draft) remains the real enforcement layer.
export default async function NewEventPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const caps = await getMyOrgCapabilities(orgId)

  if (!caps.manage) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card className="border-danger/50">
          <CardBody className="flex flex-col gap-2 p-5">
            <h2 className="text-h2">Permission denied</h2>
            <p className="text-[13px] text-ink-3">
              You need to be an organizer or admin to create events.
            </p>
            <Link
              href={`/orgs/${orgId}/dashboard`}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Back to dashboard
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return <NewEventForm orgId={orgId} />
}
