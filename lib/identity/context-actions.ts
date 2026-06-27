"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { CONTEXT_COOKIE } from "@/lib/identity/context"

/**
 * Remember the chosen context and navigate to it. Switching surfaces is just
 * navigation — each context's home route already carries its own shell/nav and
 * RLS-scoped data, so the whole surface swaps.
 */
export async function switchContextAction(key: string, href: string) {
  // Only allow same-origin app paths.
  const safeHref = href.startsWith("/") && !href.startsWith("//") ? href : "/me"

  const store = await cookies()
  store.set(CONTEXT_COOKIE, key, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  redirect(safeHref)
}
