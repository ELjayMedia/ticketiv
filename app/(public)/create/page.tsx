"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  QrCode,
  BarChart3,
  Users,
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react"
import { useAuth } from "@/lib/providers/auth-context"

export default function CreateEventPage() {
  const router = useRouter()
  const auth = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Organizer flow: redirect to event wizard
  if (mounted && auth.role === "organizer" && auth.orgId) {
    router.push(`/orgs/${auth.orgId}/events/new`)
    return null
  }

  const features = [
    {
      icon: <QrCode className="h-8 w-8" />,
      title: "QR Code Check-in",
      description: "Staff scan tickets at the door. Real-time attendance tracking built in.",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Live Analytics",
      description: "Watch sales, attendance, and revenue updates as they happen.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Management",
      description: "Control who can create events, check in, and view data.",
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "Fast Payouts",
      description: "Transparent fees. Get paid directly to your bank account.",
    },
  ]

  // Attendee flow: show org setup CTA
  if (mounted && auth.role === "attendee") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Alert className="mb-8 border-blue-500 bg-blue-50 text-blue-900">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              You're currently signed in as an attendee. To host events, you'll need to set up your organizer profile.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Finish Your Organizer Setup</CardTitle>
              <CardDescription>
                It only takes 2 minutes to complete your organization profile and start hosting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">What you'll need:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Organization name and basic info</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Your display name and contact email</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Preferred country and currency</span>
                  </li>
                </ul>
              </div>

              <Button className="w-full" size="lg" onClick={() => router.push("/onboarding/organizer")}>
                Set Up Organizer Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Guest flow: show value page with signup CTA
  if (!mounted) return null

  return (
    <main className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge className="mx-auto" variant="secondary">
            <Zap className="h-3 w-3 mr-1" />
            Start Hosting Events
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance leading-tight">
            Host and Sell Tickets on Ticketiv
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to sell tickets, manage attendees, and run successful events. No credit card required to get started.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => router.push("/signup?type=organizer")}>
              Start Hosting Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Sell Tickets Like a Pro</h2>
            <p className="text-muted-foreground">All the tools professional event organizers need</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6 flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Quick Start in 4 Steps</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                number: "1",
                title: "Create Organization",
                description: "Set your org name, country, and currency. Takes 2 minutes.",
              },
              {
                number: "2",
                title: "Create Your First Event",
                description: "Add title, date, venue, and ticket types. Start with a draft if you need.",
              },
              {
                number: "3",
                title: "Share & Sell",
                description: "Publish when ready. Get a unique link, start selling tickets immediately.",
              },
              {
                number: "4",
                title: "Manage & Get Paid",
                description: "Check in attendees with QR codes. Track sales. Get paid to your bank account.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary font-bold">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-6">Trusted by event organizers worldwide</p>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <p className="text-sm text-muted-foreground">Events Created</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">2M+</div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500K+</div>
              <p className="text-sm text-muted-foreground">Active Organizers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to Host?</h2>
          <p className="text-lg text-muted-foreground">
            Create your free organizer account and start selling tickets today. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="min-w-[200px]" onClick={() => router.push("/signup?type=organizer")}>
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Learn More</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-foreground">
              Sign in here
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge className="mx-auto" variant="secondary">
            <Zap className="h-3 w-3 mr-1" />
            Start Hosting Events
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance leading-tight">
            Host and Sell Tickets on Ticketiv
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to sell tickets, manage attendees, and run successful events. No credit card required to get started.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => router.push("/signup?type=organizer")}>
              Start Hosting Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (getDemoSession()) {
                  router.push("/app/home")
                } else {
                  router.push("/login")
                }
              }}
            >
              {getDemoSession() ? "Back to Dashboard" : "Sign In"}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Sell Tickets Like a Pro</h2>
            <p className="text-muted-foreground">All the tools professional event organizers need</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6 flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Quick Start in 4 Steps</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                number: "1",
                title: "Create Organization",
                description: "Set your org name, country, and currency. Takes 2 minutes.",
              },
              {
                number: "2",
                title: "Create Your First Event",
                description: "Add title, date, venue, and ticket types. Start with a draft if you need.",
              },
              {
                number: "3",
                title: "Share & Sell",
                description: "Publish when ready. Get a unique link, start selling tickets immediately.",
              },
              {
                number: "4",
                title: "Manage & Get Paid",
                description: "Check in attendees with QR codes. Track sales. Get paid to your bank account.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary font-bold">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-6">Trusted by event organizers worldwide</p>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <p className="text-sm text-muted-foreground">Events Created</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">2M+</div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500K+</div>
              <p className="text-sm text-muted-foreground">Active Organizers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to Host?</h2>
          <p className="text-lg text-muted-foreground">
            Create your free organizer account and start selling tickets today. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="min-w-[200px]" onClick={() => router.push("/signup?type=organizer")}>
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Learn More</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            💡 Already have an account?{" "}
            <Link href="/login" className="underline hover:text-foreground">
              Sign in here
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
