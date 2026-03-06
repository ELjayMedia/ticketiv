"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2, AlertCircle, Building2, User } from "lucide-react"
import { getDemoSession, setDemoSession } from "@/lib/demo-auth"

export default function OrganizerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<"org" | "profile">("org")
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

  const handleOrgNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!orgName.trim()) {
      setError("Organization name is required")
      return
    }

    // Move to profile step
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

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Generate orgId for demo
      const orgId = `org-${Date.now()}`

      // Get current demo session and update it
      const currentSession = getDemoSession()
      if (currentSession) {
        setDemoSession({
          ...currentSession,
          role: "organizer",
          org_id: orgId,
        })
      }

      // In production:
      // 1. Create organization in Supabase
      // 2. Add user as admin member
      // 3. Create default settings
      // 4. Redirect to event wizard

      setSuccess(true)

      setTimeout(() => {
        // Redirect to event creation with the new orgId
        router.push(`/orgs/${orgId}/events/new`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
      console.error("[v0] Onboarding error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-primary hover:opacity-80 transition-opacity">
            <span className="text-sm font-medium">← Back to Home</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Set Up Your Organization</h1>
          <p className="text-muted-foreground">Just a couple of steps to start hosting events on Ticketiv</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Tabs value={step} onValueChange={(v: any) => setStep(v)} className="w-full" disabled={loading}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="org" disabled={loading} className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Organization</span>
              </TabsTrigger>
              <TabsTrigger value="profile" disabled={loading || step === "org"} className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>

            {/* Step 1: Organization */}
            <TabsContent value="org" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                  <CardDescription>Tell us about your organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleOrgNext} className="space-y-4">
                    {error && step === "org" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        placeholder="e.g., Sunset Festival Productions"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Your organization name will appear on event pages</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry} disabled={loading}>
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                          <SelectTrigger id="currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.symbol} {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="logo">Logo URL (optional)</Label>
                      <Input
                        id="logo"
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">We'll display this on your event pages</p>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full" disabled={loading}>
                        Next: Profile Setup
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Profile */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organizer Profile</CardTitle>
                  <CardDescription>How should we contact you?</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {error && step === "profile" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-green-500 bg-green-50 text-green-900">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>Organization created! Redirecting to event creation...</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={loading || success}
                        required
                      />
                      <p className="text-xs text-muted-foreground">How you'll be shown as the organizer</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactEmail">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="contact@organizer.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        disabled={loading || success}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Attendees may contact you at this email</p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 border border-muted">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="skipPayouts"
                          checked={skipPayouts}
                          onChange={(e) => setSkipPayouts(e.target.checked)}
                          disabled={loading || success}
                          className="mt-1"
                        />
                        <label htmlFor="skipPayouts" className="flex-1">
                          <p className="text-sm font-medium">Skip payout setup for now</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Payout setup can be completed later. You can add your bank details and complete payout configuration in your settings whenever you're ready.
                          </p>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("org")}
                        disabled={loading || success}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button type="submit" disabled={loading || success} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : success ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Done!
                          </>
                        ) : (
                          "Complete Setup"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-muted">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> After setup, you'll be taken directly to create your first event. You can
                    always edit organization details later in settings.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
                        placeholder="e.g., Sunset Festival Productions"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Your organization name will appear on event pages</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry} disabled={loading}>
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                          <SelectTrigger id="currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.symbol} {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="logo">Logo URL (optional)</Label>
                      <Input
                        id="logo"
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">We'll display this on your event pages</p>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full" disabled={loading}>
                        Next: Profile Setup
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Profile */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organizer Profile</CardTitle>
                  <CardDescription>How should we contact you?</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {error && step === "profile" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-green-500 bg-green-50 text-green-900">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>Organization created! Redirecting to event creation...</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={loading || success}
                        required
                      />
                      <p className="text-xs text-muted-foreground">How you'll be shown as the organizer</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactEmail">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="contact@organizer.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        disabled={loading || success}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Attendees may contact you at this email</p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 border border-muted">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="skipPayouts"
                          checked={skipPayouts}
                          onChange={(e) => setSkipPayouts(e.target.checked)}
                          disabled={loading || success}
                          className="mt-1"
                        />
                        <label htmlFor="skipPayouts" className="flex-1">
                          <p className="text-sm font-medium">Skip payout setup for now</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You can set up bank details and complete payout configuration later in your settings.
                          </p>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("org")}
                        disabled={loading || success}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button type="submit" disabled={loading || success} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : success ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Done!
                          </>
                        ) : (
                          "Complete Setup"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-muted">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> After setup, you'll be taken directly to create your first event. You can
                    always edit organization details later in settings.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
