"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { Segmented } from "@/components/quiet/ui/primitives"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/cn"
import { getDemoSession, setDemoSession } from "@/lib/demo-auth"

type Step = "org" | "profile"

export default function OrganizerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("org")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Step 1: Organization
  const [orgName, setOrgName] = useState("")
  const [country, setCountry] = useState("US")
  const [currency, setCurrency] = useState("USD")
  const [logoUrl, setLogoUrl] = useState("")

  // Step 2: Profile
  const [displayName, setDisplayName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [skipPayouts, setSkipPayouts] = useState(true)

  const countries = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
    { code: "AU", name: "Australia" },
  ]

  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "AUD", symbol: "A$" },
  ]

  const handleOrgNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!orgName.trim()) {
      setError("Organization name is required")
      return
    }
    setStep("profile")
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      if (!displayName.trim()) {
        setError("Display name is required")
        return
      }
      if (!contactEmail.trim()) {
        setError("Contact email is required")
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))

      const orgId = `org-${Date.now()}`
      const currentSession = getDemoSession()
      if (currentSession) {
        setDemoSession({ ...currentSession, role: "organizer", org_id: orgId })
      }

      setSuccess(true)
      setTimeout(() => router.push(`/orgs/${orgId}/events/new`), 1500)
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

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
            Two quick steps to start hosting.
          </h1>
        </div>

        <Segmented
          options={[
            { value: "org", label: "Organisation" },
            { value: "profile", label: "Profile" },
          ]}
          value={step}
          onChange={(next) => {
            if (loading) return
            if (next === "profile" && step === "org") return
            setStep(next)
          }}
        />

        {step === "org" && (
          <Card>
            <CardBody className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-h2">Organisation details</h2>
                <p className="text-[13px] text-ink-3">Tell us about your organisation.</p>
              </div>

              <form onSubmit={handleOrgNext} className="flex flex-col gap-4">
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
                  disabled={loading}
                  required
                  hint="Your organisation name will appear on event pages."
                />

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-label">Country</span>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={loading}
                      className={selectClass}
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-label">Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={loading}
                      className={selectClass}
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <FormField
                  label="Logo URL (optional)"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={loading}
                  hint="We’ll display this on your event pages."
                />

                <Button type="submit" variant="primary" size="md" disabled={loading} block>
                  Next: profile setup
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {step === "profile" && (
          <Card>
            <CardBody className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-h2">Organiser profile</h2>
                <p className="text-[13px] text-ink-3">How should we contact you?</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                    <Icon name="close" size={14} className="mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
                    <Icon name="check" size={14} className="mt-0.5 text-success" />
                    <span>Organisation created. Redirecting to event creation…</span>
                  </div>
                )}

                <FormField
                  label="Display name *"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading || success}
                  required
                  hint="How you’ll be shown as the organiser."
                />

                <FormField
                  label="Contact email *"
                  type="email"
                  placeholder="contact@organizer.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={loading || success}
                  required
                  hint="Attendees may contact you at this email."
                />

                <label
                  className={cn(
                    "flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-bg p-3",
                    (loading || success) && "opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={skipPayouts}
                    onChange={(e) => setSkipPayouts(e.target.checked)}
                    disabled={loading || success}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-[13px] font-semibold text-ink">Skip payout setup for now</span>
                    <span className="text-[12px] text-ink-3">
                      Payout setup can be completed later. You can add your bank details and complete payout configuration in settings whenever you’re ready.
                    </span>
                  </span>
                </label>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setStep("org")}
                    disabled={loading || success}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading || success}
                    className="flex-1"
                  >
                    {loading ? "Creating…" : success ? "Done" : "Complete setup"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        <Card flat className="bg-bg">
          <CardBody>
            <p className="text-[12px] text-ink-3">
              After setup, you’ll go directly to creating your first event. Organisation details remain editable in settings.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  )
}
