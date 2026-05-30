import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoOrganization } from "@/lib/demo-data"

export const dynamic = "force-dynamic"

interface FeatureFlag {
  id: string
  key: string
  description: string | null
  enabled: boolean
  config?: Record<string, unknown>
}

export default async function FeatureFlagsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let org: any = null
  let flags: FeatureFlag[] = []

  if (demoSessionCookie) {
    try {
      org = getDemoOrganization(orgId)
      if (!org) return redirect("/403")
      flags = [
        { id: "advanced-analytics", key: "advanced-analytics", description: "Enable detailed event analytics and reporting", enabled: true, config: { retention_days: 90 } },
        { id: "custom-branding", key: "custom-branding", description: "Allow custom colors and logos for events", enabled: true },
        { id: "api-access", key: "api-access", description: "Enable API access for integrations", enabled: false },
        { id: "team-collaboration", key: "team-collaboration", description: "Enable team features and permissions", enabled: true },
        { id: "sso-login", key: "sso-login", description: "Enable single sign-on integration", enabled: false },
      ]
    } catch {
      /* fall through */
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle()
    if (!orgData) return redirect("/403")
    org = orgData

    const { data: flagsData = [] } = await supabase
      .from("feature_flags")
      .select("id, key, description, enabled, config")
      .eq("org_id", orgId)
    flags = (flagsData ?? []) as FeatureFlag[]
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/dashboard`}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Feature flags</h1>
            <p className="text-[13px] text-ink-3">{org?.name}</p>
          </div>
        </div>

        {flags.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
              <Icon name="zap" size={32} className="text-ink-4" />
              <p className="text-[13px] text-ink-3">No feature flags available.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map((flag) => (
              <Card key={flag.id}>
                <CardBody className="flex items-start justify-between gap-4 pt-6">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-ink">{flag.key}</h3>
                      <Chip size="sm" variant={flag.enabled ? "active" : "muted"}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </Chip>
                    </div>
                    <p className="text-[13px] text-ink-3">{flag.description}</p>
                    {flag.config && (
                      <div className="mt-2 rounded-[var(--radius-sm)] bg-bg p-2">
                        <p className="font-mono text-[11px] text-ink-3">
                          {JSON.stringify(flag.config, null, 2)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {flag.enabled ? "On" : "Off"}
                    </span>
                    <span
                      className={
                        flag.enabled
                          ? "inline-block h-5 w-9 rounded-full bg-accent opacity-60"
                          : "inline-block h-5 w-9 rounded-full bg-line-2 opacity-60"
                      }
                      aria-hidden
                    />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardBody className="flex flex-col gap-2 p-5">
            <p className="text-h3">About feature flags</p>
            <p className="text-[13px] text-ink-3">
              Feature flags control advanced capabilities for your organisation. Changes typically take effect immediately.
            </p>
            <p className="text-[13px] text-ink-3">
              Contact support to request new features or modifications to your flags.
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
