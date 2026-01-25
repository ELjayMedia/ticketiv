import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganization } from "@/lib/demo-data"
import { ArrowLeft, Zap } from "lucide-react"

export const dynamic = "force-dynamic"

interface FeatureFlag {
  id: string
  name: string
  description: string
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
      if (!org) {
        return redirect("/403")
      }
      // Demo feature flags
      flags = [
        {
          id: "advanced-analytics",
          name: "Advanced Analytics",
          description: "Enable detailed event analytics and reporting",
          enabled: true,
          config: { retention_days: 90 },
        },
        {
          id: "custom-branding",
          name: "Custom Branding",
          description: "Allow custom colors and logos for events",
          enabled: true,
        },
        {
          id: "api-access",
          name: "API Access",
          description: "Enable API access for integrations",
          enabled: false,
        },
        {
          id: "team-collaboration",
          name: "Team Collaboration",
          description: "Enable team features and permissions",
          enabled: true,
        },
        {
          id: "sso-login",
          name: "SSO Login",
          description: "Enable single sign-on integration",
          enabled: false,
        },
      ]
    } catch (error) {
      console.error("[v0] Failed to load demo data:", error)
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return redirect("/login")
    }

    // Fetch org
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle()

    if (!orgData) {
      return redirect("/403")
    }

    org = orgData

    // Fetch feature flags
    const { data: flagsData = [] } = await supabase
      .from("feature_flags")
      .select("id, name, description, enabled, config")
      .eq("org_id", orgId)

    flags = flagsData as FeatureFlag[]
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/orgs/${orgId}/dashboard`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Feature Flags</h1>
              <p className="text-muted-foreground mt-1">{org?.name}</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        {flags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground">No feature flags available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <Card key={flag.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{flag.name}</h3>
                        <Badge variant={flag.enabled ? "default" : "secondary"}>
                          {flag.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                      {flag.config && (
                        <div className="mt-3 p-2 rounded bg-muted/50">
                          <p className="text-xs font-mono text-muted-foreground">
                            {JSON.stringify(flag.config, null, 2)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`flag-${flag.id}`} className="text-sm cursor-pointer">
                        {flag.enabled ? "On" : "Off"}
                      </Label>
                      <Switch
                        id={`flag-${flag.id}`}
                        defaultChecked={flag.enabled}
                        disabled
                        className="cursor-not-allowed"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Feature flags control advanced capabilities for your organization. Changes typically take effect
              immediately.
            </p>
            <p>Contact support to request new features or modifications to your flags.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
