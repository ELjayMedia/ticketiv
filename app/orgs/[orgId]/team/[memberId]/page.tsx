import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"

function roleBadgeVariant(role: string): "active" | "muted" | "default" {
  if (role.includes("owner") || role.includes("admin")) return "active"
  if (role === "scanner" || role === "pos") return "muted"
  return "default"
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ orgId: string; memberId: string }>
}) {
  const { orgId, memberId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return redirect("/403")

  const { data: member } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", orgId)
    .eq("user_id", memberId)
    .maybeSingle()

  if (!member) notFound()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, name, surname")
    .eq("user_id", memberId)
    .maybeSingle()

  const admin = createAdminClient()
  let email: string | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(memberId)
    email = data?.user?.email ?? null
  } catch {}

  const composedName = [profile?.name, profile?.surname].filter(Boolean).join(" ").trim()
  const displayName = profile?.display_name || composedName || email?.split("@")[0] || "Member"

  const joinedAt = member.created_at
    ? new Date(member.created_at).toLocaleDateString("en-SZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—"

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-lg p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/team`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <h1 className="text-h1">Member</h1>
        </div>

        <Card className="overflow-hidden">
          <CardBody className="flex items-center gap-4 p-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent text-[18px]">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{displayName}</span>
              {email && (
                <span className="font-mono text-[12px] text-ink-3">{email}</span>
              )}
            </div>
            <span className="flex-1" />
            <Chip size="sm" variant={roleBadgeVariant(member.role)} className="capitalize">
              {String(member.role).replaceAll("_", " ")}
            </Chip>
          </CardBody>

          <CardDivider />

          <CardBody className="grid grid-cols-2 gap-4 p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-label">Organisation</span>
              <span className="text-[13px] font-semibold">{org.name}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-label">Role</span>
              <span className="text-[13px] font-semibold capitalize">
                {String(member.role).replaceAll("_", " ")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-label">Joined</span>
              <span className="font-mono text-[12px] text-ink-3">{joinedAt}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-label">Event access</span>
              <span className="font-mono text-[12px] text-ink-3">All events</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
