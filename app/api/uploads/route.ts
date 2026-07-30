import { randomUUID } from "node:crypto"

import { type NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

const EVENT_COVERS_BUCKET = "event-covers"
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

async function canManageEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  userId: string,
) {
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw eventError
  if (!event) return { allowed: false, event: null }

  const [{ data: globalAdmin, error: adminError }, { data: member, error: memberError }] = await Promise.all([
    admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle(),
    admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle(),
  ])

  if (adminError) throw adminError
  if (memberError) throw memberError

  return {
    allowed: Boolean(globalAdmin || (member?.role && MANAGER_ROLES.has(String(member.role)))),
    event,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (user.is_anonymous) {
      return NextResponse.json({ error: "Claim your account before uploading an event cover" }, { status: 403 })
    }

    const formData = await request.formData()
    const fileValue = formData.get("file")
    const eventIdValue = formData.get("eventId")

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    const eventId = typeof eventIdValue === "string" ? eventIdValue.trim() : ""
    if (!eventId) {
      return NextResponse.json({ error: "Event id is required" }, { status: 400 })
    }

    const extension = IMAGE_EXTENSIONS[fileValue.type]
    if (!extension) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP image" }, { status: 400 })
    }

    if (fileValue.size === 0) {
      return NextResponse.json({ error: "The selected image is empty" }, { status: 400 })
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Cover images must be smaller than 8 MB" }, { status: 413 })
    }

    const admin = createAdminClient()
    const { allowed, event } = await canManageEvent(admin, eventId, user.id)

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (!allowed) {
      return NextResponse.json({ error: "You do not have permission to edit this event" }, { status: 403 })
    }

    const objectPath = `events/${eventId}/${randomUUID()}.${extension}`
    const fileBuffer = Buffer.from(await fileValue.arrayBuffer())

    const { data, error: uploadError } = await admin.storage
      .from(EVENT_COVERS_BUCKET)
      .upload(objectPath, fileBuffer, {
        contentType: fileValue.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("[uploads] Supabase event cover upload failed", {
        eventId,
        userId: user.id,
        statusCode: uploadError.statusCode,
        message: uploadError.message,
      })

      const message = uploadError.message.toLowerCase().includes("bucket not found")
        ? "Event cover storage is not configured"
        : "Failed to store the event cover"

      return NextResponse.json({ error: message }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error("[uploads] Event cover upload failed", error)
    return NextResponse.json({ error: "Failed to upload the event cover" }, { status: 500 })
  }
}
