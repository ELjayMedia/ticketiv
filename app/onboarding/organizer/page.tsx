"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { Logo } from "@/components/Logo"
import { createOrganizationAction } from "./actions"

// Eswatini-first; the platform's default currency is SZL.
const CURRENCIES = [
  { code: "SZL", label: "SZL · Lilangeni" },
  { code: "ZAR", label: "ZAR · Rand" },
  { code: "USD", label: "USD · US Dollar" },
]

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export default function OrganizerOnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState("")
  const [currency, setCurrency] = useState("SZL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!orgName.trim()) {
      setError("Organisation name is required")
      return
    }
    setLoading(true)
    const result = await createOrganizationAction({ name: orgName, currency })
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    setDone(true)
    // Continue straight into creating the first event — the wizard is the
    // rest of organizer onboarding. The dashboard checklist (event → profile
    // → payout → scanner → team) picks up from there.
    router.push(`/orgs/${result.orgId}/events/new`)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Back to home
        </Link>
      </header>

      <section className="mt-12 flex flex-col gap-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Set up your organisation</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Create your organisation to start hosting.
          </h1>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Organisation details</h2>
              <p className="text-[13px] text-ink-3">
                You can add your logo, bio and team from the dashboard once you&apos;re in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                  <Icon name="close" size={14} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <FormField
                label="Organisation name *"
                placeholder="e.g., Sunset Festival Productions"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={loading || done}
                required
                hint="This appears on your event pages. You can rename it later."
              />

              <label className="flex flex-col gap-1">
                <span className="text-label">Default currency</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={loading || done}
                  className={selectClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit" variant="primary" size="md" disabled={loading || done} block>
                {loading ? "Creating…" : done ? "Done" : "Create organisation"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card flat className="bg-bg">
          <CardBody>
            <p className="text-[12px] text-ink-3">
              After this you&apos;ll land in your dashboard with a checklist: complete your profile, create your first
              event, add a payout account and invite staff.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  )
}
