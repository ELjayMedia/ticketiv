import { NextResponse, type NextRequest } from "next/server"

import { isMissingEnvironmentVariableError } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createEnvVar,
  deleteEnvVar,
  listEnvVars,
  updateEnvVar,
  type CreateEnvVar,
  type EnvTarget,
} from "@/lib/vercel-env"

export const dynamic = "force-dynamic"

type RouteContext =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

const TARGETS: EnvTarget[] = ["production", "preview", "development"]

async function requireEnvVarAdmin(): Promise<RouteContext> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.warn("[ticketiv] env-vars auth lookup failed", userError.message)
    }

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
      }
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("admin_users")
      .select("role_tier, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()

    if (error) {
      console.error("[ticketiv] env-vars admin lookup failed", error.message)
      return {
        ok: false,
        response: NextResponse.json({ error: "Unable to verify admin role" }, { status: 500 }),
      }
    }

    if (!data || data.role_tier !== "super_admin") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
      }
    }

    return { ok: true, userId: user.id }
  } catch (error) {
    if (isMissingEnvironmentVariableError(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Missing server configuration", missing: error.variableName },
          { status: 500 }
        ),
      }
    }

    console.error("[ticketiv] env-vars authorization failed", error)
    return {
      ok: false,
      response: NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    }
  }
}

function isTargetList(value: unknown): value is EnvTarget[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => TARGETS.includes(entry as EnvTarget))
  )
}

function errorResponse(error: unknown) {
  if (isMissingEnvironmentVariableError(error)) {
    return NextResponse.json(
      { error: "Missing server configuration", missing: error.variableName },
      { status: 500 }
    )
  }

  const message = error instanceof Error ? error.message : "Unexpected error"
  console.error("[ticketiv] env-vars operation failed", error)
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function GET() {
  const auth = await requireEnvVarAdmin()
  if (!auth.ok) return auth.response

  try {
    const vars = await listEnvVars()
    // Mask all values before sending to client.
    const safe = vars.map(({ value: _value, ...rest }) => ({
      ...rest,
      value: null,
    }))
    return NextResponse.json({ envVars: safe }, { status: 200 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEnvVarAdmin()
  if (!auth.ok) return auth.response

  let body: Partial<CreateEnvVar>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const key = typeof body.key === "string" ? body.key.trim() : ""
  const value = typeof body.value === "string" ? body.value : ""
  const type = body.type === "plain" || body.type === "encrypted" ? body.type : "encrypted"

  if (!key) return NextResponse.json({ error: "Key is required" }, { status: 400 })
  if (/\s/.test(key)) {
    return NextResponse.json({ error: "Key cannot contain spaces" }, { status: 400 })
  }
  if (!value) return NextResponse.json({ error: "Value is required" }, { status: 400 })
  if (!isTargetList(body.target)) {
    return NextResponse.json({ error: "At least one target is required" }, { status: 400 })
  }

  try {
    const created = await createEnvVar({ key, value, type, target: body.target })
    return NextResponse.json({ envVar: { ...created, value: null } }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireEnvVarAdmin()
  if (!auth.ok) return auth.response

  let body: { id?: string; value?: string; target?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Env var id is required" }, { status: 400 })

  const update: Partial<Pick<CreateEnvVar, "value" | "target">> = {}
  if (typeof body.value === "string" && body.value.length > 0) {
    update.value = body.value
  }
  if (body.target !== undefined) {
    if (!isTargetList(body.target)) {
      return NextResponse.json({ error: "At least one target is required" }, { status: 400 })
    }
    update.target = body.target
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  try {
    const updated = await updateEnvVar(id, update)
    return NextResponse.json({ envVar: { ...updated, value: null } }, { status: 200 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireEnvVarAdmin()
  if (!auth.ok) return auth.response

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Env var id is required" }, { status: 400 })

  try {
    await deleteEnvVar(id)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    return errorResponse(error)
  }
}
