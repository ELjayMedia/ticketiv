"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, Mail, Phone } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

type Channel = "phone" | "email"
type AuthMode = "login" | "signup"

const ESWATINI_DIAL = "+268"

const ROLE_CARDS = [
  {
    label: "Attendee",
    description: "Buy tickets, save events and manage your QR tickets.",
  },
  {
    label: "Organizer",
    description: "Created automatically when your UUID creates or owns an event.",
  },
  {
    label: "Scanner",
    description: "Granted when your UUID is added to event staff for scanning.",
  },
  {
    label: "Talent",
    description: "For artists, speakers and performers linked to a public profile.",
  },
]

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, "")
  if (cleaned.startsWith("+")) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null
  }
  const local = cleaned.replace(/^0+/, "")
  const candidate = `${ESWATINI_DIAL}${local}`
  return /^\+\d{8,15}$/.test(candidate) ? candidate : null
}

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "signup") {
    return {
      submit: "Create account",
      busy: "Creating…",
      help: "We’ll create your Ticketiv ID as an Attendee first. Organizer, Scanner and Talent access are unlocked later from UUID-linked records.",
      alternate: "Already have an account?",
      alternateCta: "Log in",
      alternateHref: "/sign-in",
    }
  }

  return {
    submit: "Log in",
    busy: "Sending…",
    help: "Use the same phone or email linked to your Ticketiv ID.",
    alternate: "New to Ticketiv?",
    alternateCta: "Create an account",
    alternateHref: "/signup",
  }
}

export function SignInForm({ mode = "login" }: { mode?: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [channel, setChannel] = useState<Channel>("email")
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getAuthCopy(mode)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const supabase = createClient()
    const shouldCreateUser = mode === "signup"
    const redirectTo = search.get("redirectTo") || search.get("from")

    if (channel === "phone") {
      const phone = normalizePhone(value)
      if (!phone) {
        setError("That phone number doesn't look right. Try your number without the country code, or include +268.")
        return
      }

      setBusy(true)
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: "sms", shouldCreateUser },
      })
      setBusy(false)

      if (error) {
        setError(mode === "login" ? "We could not find that Ticketiv account. Create an account first, then log in." : error.message)
        return
      }

      const params = new URLSearchParams({ channel: "phone", to: phone, mode })
      if (redirectTo) params.set("redirectTo", redirectTo)
      router.push(`/verify?${params.toString()}`)
      return
    }

    const email = value.trim().toLowerCase()
    if (!isValidEmail(email)) {
      setError("That email doesn't look right.")
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser },
    })
    setBusy(false)

    if (error) {
      setError(mode === "login" ? "We could not find that Ticketiv account. Create an account first, then log in." : error.message)
      return
    }

    const params = new URLSearchParams({ channel: "email", to: email, mode })
    if (redirectTo) params.set("redirectTo", redirectTo)
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Tabs value={channel} onValueChange={(v) => { setChannel(v as Channel); setValue(""); setError(null) }}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="email" className="gap-2 rounded-lg"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="phone" className="gap-2 rounded-lg"><Phone className="h-4 w-4" /> Phone</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-5 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="email-input">Email address</Label>
              <Input
                id="email-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">We’ll send a 6-digit code to your inbox.</p>
            </div>
          </TabsContent>

          <TabsContent value="phone" className="mt-5 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone-input">Phone number</Label>
              <div className="flex h-12 overflow-hidden rounded-xl border border-input bg-background">
                <div className="flex items-center border-r border-border bg-muted px-3 text-sm text-muted-foreground">
                  {ESWATINI_DIAL}
                </div>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="76 12 34 56"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">No country code needed for Eswatini numbers.</p>
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs leading-5 text-muted-foreground">{copy.help}</p>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={busy || !value} className="h-12 w-full rounded-xl" size="lg">
          {busy ? copy.busy : copy.submit} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {mode === "signup" && (
        <Card className="rounded-2xl bg-muted/40">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Ticketiv access roles</p>
            <div className="grid gap-2">
              {ROLE_CARDS.map((role) => (
                <div key={role.label} className="rounded-xl bg-background/80 p-3">
                  <p className="text-sm font-medium">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {copy.alternate} <Link href={copy.alternateHref} className="font-medium text-primary underline-offset-4 hover:underline">{copy.alternateCta}</Link>
      </p>
    </div>
  )
}
