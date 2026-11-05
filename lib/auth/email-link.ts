import { NextResponse, type NextRequest } from "next/server"

import { safeNext } from "@/lib/auth/redirect"

/** Where an auth email link should continue to (`next` or `redirectTo`), same-site only. */
export function linkNext(request: NextRequest): string {
  const params = request.nextUrl.searchParams
  return safeNext(params.get("next")) ?? safeNext(params.get("redirectTo")) ?? "/"
}

export function redirectWithError(request: NextRequest, destination: { pathname: string; error: string }) {
  const url = new URL(destination.pathname, request.url)
  url.searchParams.set("error", destination.error)
  return NextResponse.redirect(url)
}
