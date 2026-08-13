import { NextResponse } from "next/server";

import { getMyContexts } from "@/lib/data/identity/contexts";
import { getActiveContextKey } from "@/lib/identity/context";

export const dynamic = "force-dynamic";

/** Returns the authenticated user's existing workspace-switcher model. */
export async function GET() {
  const [contexts, activeContextKey] = await Promise.all([
    getMyContexts(),
    getActiveContextKey(),
  ]);

  return NextResponse.json({ contexts, activeContextKey });
}
