import "server-only"

import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { getBearerUser, MobileOrganizerError } from "@/lib/mobile/organizer"

/** Wrap a Ticketiv Organizer mobile API handler: bearer auth, JSON errors, no caching. */
export async function withMobileOrganizerUser(
  request: Request,
  handler: (user: User) => Promise<unknown>,
  successStatus = 200,
): Promise<Response> {
  const headers = { "cache-control": "no-store" }
  try {
    const user = await getBearerUser(request)
    if (!user) return NextResponse.json({ error: "Sign in again to continue" }, { status: 401, headers })
    return NextResponse.json(await handler(user), { status: successStatus, headers })
  } catch (error) {
    if (error instanceof MobileOrganizerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers })
    }
    console.error("[mobile-organizer]", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers })
  }
}
