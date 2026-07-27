"use client"

import { BoxOffice } from "@/components/quiet/screens/pos/box-office"
import type { POSEventContext } from "@/lib/data/organizer/pos"

export function POSClient({ ctx }: { ctx: POSEventContext }) {
  return <BoxOffice ctx={ctx} />
}
