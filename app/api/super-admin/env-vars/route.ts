import { NextResponse, type NextRequest } from "next/server"

import { requireAdminRole } from "@/lib/super-admin/auth"
import {
  createEnvVar,
  deleteEnvVar,
  listEnvVars,
  updateEnvVar,
  type CreateEnvVar,
  type EnvTarget,
} from "@/lib/vercel-env"

export const dynamic = "force-dynamic"

const TARGETS: EnvTarget[] = ["production", "preview", "development"]

async function requireEnvVarAdmin() {
  await requireAdminRole(["super_admin"])
}

function isTargetList(value: unknown): value is EnvTarget[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => TARGETS.includes(entry as EnvTarget))
  )
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error"
  return NextResponse.json({ error: message }, { status: 502 })
}

export async function GET() {
  await requireEnvVarAdmin()
  try {
    const vars = await listEnvVars()
    // Mask all values before sending to client.
    const safe = vars.map(({ value: _value, ...rest }) => ({
      ...rest,
      value: null,
    }))
    return NextResponse.json({ envVars: safe })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  await requireEnvVarAdmin()

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
  await requireEnvVarAdmin()

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
    return NextResponse.json({ envVar: { ...updated, value: null } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  await requireEnvVarAdmin()

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
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
