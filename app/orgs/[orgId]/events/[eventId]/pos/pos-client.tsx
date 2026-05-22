"use client"

import * as React from "react"
import { BoxOffice } from "@/components/quiet/screens/pos/box-office"
import type { POSEventContext } from "@/lib/data/organizer/pos"
import { posCharge } from "./actions"

export function POSClient({ ctx }: { ctx: POSEventContext }) {
  const onCharge = React.useCallback(
    async (input: Parameters<NonNullable<React.ComponentProps<typeof BoxOffice>["onCharge"]>>[0]) => {
      await posCharge({
        orgId: ctx.orgId,
        eventId: ctx.eventId,
        items: input.items,
        method: input.method,
        buyer: input.buyer,
      })
    },
    [ctx.orgId, ctx.eventId],
  )

  return <BoxOffice ctx={ctx} onCharge={onCharge} />
}
