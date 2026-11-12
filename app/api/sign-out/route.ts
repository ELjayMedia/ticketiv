import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Keep logout on the origin the browser used. In a self-hosted Next.js
  // container, request.url can contain the internal bind address
  // (https://0.0.0.0:3000) even when the reverse proxy supplied the correct
  // public X-Forwarded-Host. A relative Location is both sufficient for a 303
  // and unable to leak localhost/container addresses into browser redirects.
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } })
}
