"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"

type Channel = "phone" | "email"

const ESWATINI_DIAL = "+268"

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

export function SignInForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [channel, setChannel] = useState<Channel>("phone")
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const supabase = createClient()

    if (channel === "phone") {
      const phone = normalizePhone(value)
      if (!phone) {
        setError("That phone number doesn't look right. Try your number without the country code, or include +268.")
        return
      }
      setBusy(true)
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: "sms" },
      })
      setBusy(false)
      if (error) { setError(error.message); return }
      const params = new URLSearchParams({ channel: "phone", to: phone })
      const from = search.get("from")
      if (from) params.set("from", from)
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
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    const params = new URLSearchParams({ channel: "email", to: email })
    const from = search.get("from")
    if (from) params.set("from", from)
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Channel toggle using shadcn Tabs */}
      <Tabs value={channel} onValueChange={(v) => { setChannel(v as Channel); setValue(""); setError(null) }}>
        <TabsList>
          <TabsTrigger value="phone">Phone</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone-input">Phone number</Label>
            <div className="flex items-stretch">
              <div className="flex items-center px-3 text-sm border-r bg-muted">
                {ESWATINI_DIAL}
              </div>
              <Input
                id="phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="76 12 34 56"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll send a 6-digit code by SMS. No country code needed for Eswatini numbers.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="email" className="flex flex-col gap-4">
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
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll send a 6-digit code to your inbox.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={busy || !value}
        className="w-full"
        size="lg"
      >
        {busy ? "Sending…" : "Send code"}
      </Button>
    </form>
  )
}
