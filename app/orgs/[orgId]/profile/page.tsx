import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { requireOrgCapability } from "@/lib/data/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { updateOrgProfileAction } from "./actions"

export const metadata = { title: "Organization profile" }
export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function OrgProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { orgId } = await params
  const query = searchParams ? await searchParams : {}

  await requireOrgCapability(orgId, "manage")

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const { data: org, error } = await supabase
    .from("organizations")
    .select("name, bio, logo, default_currency")
    .eq("id", orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!org) redirect("/403")

  async function updateProfile(formData: FormData) {
    "use server"
    await updateOrgProfileAction(orgId, formData)
  }

  const saved = firstParam(query.status) === "saved"

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/orgs/${orgId}/dashboard`}
              aria-label="Back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
            >
              <Icon name="chevL" size={16} />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-h1">Organization profile</h1>
              <p className="text-[13px] text-ink-3">
                Buyer-facing brand details used by setup readiness and organizer pages.
              </p>
            </div>
          </div>
          <Link
            href={`/orgs/${orgId}/dashboard`}
            className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
          >
            Dashboard
          </Link>
        </div>

        {saved ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
            <Icon name="check" size={14} />
            Profile saved.
          </div>
        ) : null}

        <Card>
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="text-h3">Profile details</p>
            <p className="text-[12px] text-ink-3">
              Name, bio and logo complete the organizer setup checklist.
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="p-5">
            <form action={updateProfile} className="grid gap-4">
              <FormField
                label="Organization name"
                name="name"
                defaultValue={org.name ?? ""}
                required
              />

              <label className="flex flex-col gap-1">
                <span className="text-label">Bio</span>
                <textarea
                  name="bio"
                  defaultValue={org.bio ?? ""}
                  placeholder="Describe your organization for buyers."
                  className="min-h-28 w-full resize-y rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 placeholder:text-ink-4 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
                <span className="font-mono text-[11px] text-ink-3">
                  Shown on organizer-facing and buyer-facing surfaces where available.
                </span>
              </label>

              <FormField
                label="Logo URL"
                name="logo"
                defaultValue={org.logo ?? ""}
                placeholder="https://example.com/logo.png"
                hint="Use an https URL or an app-hosted path that starts with /."
              />

              <FormField
                label="Default currency"
                name="default_currency"
                defaultValue={org.default_currency ?? "SZL"}
                maxLength={3}
                required
                hint="Three-letter ISO code used by finance and dashboard surfaces."
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Link
                  href={`/orgs/${orgId}/dashboard`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                >
                  Cancel
                </Link>
                <Button type="submit" variant="primary" size="md">
                  Save profile
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
