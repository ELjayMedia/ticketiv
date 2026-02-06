"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  QrCode, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield, 
  Globe, 
  Smartphone,
  CreditCard,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle2
} from "lucide-react"

export default function HostEventPage() {
  const router = useRouter()

  const features = [
    {
      icon: <QrCode className="h-6 w-6" />,
      title: "QR Code Check-in",
      description: "Instant ticket verification with realtime check-in analytics. Staff can scan at the door with just a phone."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Live Analytics",
      description: "Watch ticket sales, attendance rates, and revenue in realtime. Make data-driven decisions instantly."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Staff Management",
      description: "Assign permissions to team members. Control who can create events, check-in guests, and view analytics."
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Fast Payouts",
      description: "Get paid quickly to your bank account. No middlemen, transparent fees, local payment methods."
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Optimized",
      description: "Event pages work perfectly on phones. Attendees can buy and access tickets seamlessly."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Instant Publishing",
      description: "Events go live immediately. Searchable, shareable, and visible to everyone on the platform."
    }
  ]

  const benefits = [
    { label: "No Setup Fees", description: "Start hosting for free" },
    { label: "Multiple Ticket Types", description: "VIP, general admission, early bird pricing" },
    { label: "Capacity Management", description: "Set limits and track inventory in real time" },
    { label: "Event Templates", description: "Reuse event details for recurring events" },
    { label: "Attendee Export", description: "Download ticket holder lists as CSV" },
    { label: "Promo Codes", description: "Create discount codes for promotions" }
  ]

  const stats = [
    { number: "50K+", label: "Events Hosted" },
    { number: "2M+", label: "Tickets Sold" },
    { number: "500K+", label: "Active Organizers" }
  ]

  return (
    <main className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge className="mx-auto" variant="secondary">
            <Zap className="h-3 w-3 mr-1" />
            All-in-One Event Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance leading-tight">
            Host Events That Sell
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Ticketiv gives you everything you need to sell tickets, manage attendees, and grow your events. No experience needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => router.push("/signup?type=organizer")}>
              Start Hosting Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/browse">Browse Events</Link>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-primary">{stat.number}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Powerful Features Built for Success</h2>
            <p className="text-muted-foreground">Everything you need to run successful events</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="hover:shadow-md transition-all border-border/50">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything Included</h2>
            <p className="text-muted-foreground">No hidden fees. No surprise charges. Simple pricing.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6 space-y-2 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">{benefit.label}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4 md:gap-2">
            {[
              { number: "1", title: "Create", description: "Set up your event in minutes" },
              { number: "2", title: "Sell", description: "Tickets sell immediately" },
              { number: "3", title: "Manage", description: "Real-time check-in & analytics" },
              { number: "4", title: "Get Paid", description: "Fast payout to your account" }
            ].map((step, i) => (
              <div key={i} className="relative">
                <Card className="border-border/50">
                  <CardContent className="pt-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto">
                      {step.number}
                    </div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {i < 3 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of event organizers. Create your first event for free today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="min-w-[200px]" onClick={() => router.push("/signup?type=organizer")}>
              Create Your First Event
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/browse">Browse Examples</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required. Start for free today.
          </p>
        </div>
      </section>
    </main>
  )
}
