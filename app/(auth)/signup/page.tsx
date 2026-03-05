"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Ticket, AlertCircle, Building2, User, Loader2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

type AccountType = "attendee" | "organizer"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialType = (searchParams.get("type") as AccountType) || "attendee"
  const fromCreate = searchParams.get("from") === "create-event"

  const [accountType, setAccountType] = useState<AccountType>(initialType)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [orgName, setOrgName] = useState("")
  const [orgDescription, setOrgDescription] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      // ---------- validation ----------
      if (!name.trim()) return setError("Please enter your full name")
      if (!email.trim()) return setError("Please enter your email address")
      if (!password) return setError("Please enter a password")
      if (!confirmPassword) return setError("Please confirm your password")
      if (accountType === "organizer" && !orgName.trim()) return setError("Please enter your organization name")

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) return setError("Please enter a valid email address")

      if (password.length < 6) return setError("Password must be at least 6 characters")
      if (password !== confirmPassword) return setError("Passwords do not match")
      if (!/[A-Z]/.test(password)) return setError("Password must contain at least one uppercase letter")
      if (!/[0-9]/.test(password)) return setError("Password must contain at least one number")

      const supabase = createClient()
      if (!supabase) {
        setError("Supabase client is not configured. Please set your Supabase environment variables.")
        return
      }

      // ---------- sign up ----------
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            account_type: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        // Supabase commonly returns a message indicating existing users
        const msg = signUpError.message?.toLowerCase() || ""
        if (msg.includes("already registered") || msg.includes("already") || msg.includes("exists")) {
          setError("This email is already registered. Please sign in instead.")
        } else {
          setError(signUpError.message || "Unable to create account. Please try again.")
        }
        return
      }

      const user = authData.user
      if (!user) {
        setError("Failed to create account. Please try again.")
        return
      }

      // ---------- create profile ----------
      // NOTE: This assumes your `profiles.id` is the auth uid (uuid), which is standard.
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: name.trim(),
        // Use your platform’s role naming here; common choices: "user"/"admin" OR "attendee"/"organizer"
        role: accountType === "organizer" ? "admin" : "user",
      })

      // Don’t block signup if profile insert fails (RLS can be finicky during early builds)
      if (profileError) {
        console.error("[ticketiv] Profile insert error:", profileError)
      }

      // ---------- organizer setup ----------
      if (accountType === "organizer") {
        // Create org row
        const { data: org, error: orgError } = await supabase
          .from("orgs")
          .insert({
            name: orgName.trim(),
            description: orgDescription.trim() || null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            default_currency: "USD",
          })
          .select("id")
          .single()

        if (orgError || !org) {
          console.error("[ticketiv] Org insert error:", orgError)
          setError("Account created but failed to set up organization. Please contact support.")
          return
        }

        // Add membership row
        const { error: memberError } = await supabase.from("org_members").insert({
          user_id: user.id,
          org_id: org.id,
          role: "admin",
        })

        if (memberError) {
          console.error("[ticketiv] Org member insert error:", memberError)
          // Don’t hard-fail; they can still access account, but org permissions might be broken
        }
      }

      setSuccess(true)

      setTimeout(() => {
        if (fromCreate && accountType === "organizer") {
          router.push("/onboarding/organizer")
        } else {
          router.push("/app/home")
        }
      }, 1200)
    } catch (err: any) {
      console.error("[ticketiv] Signup error:", err)
      setError(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side - Brand/Image section */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Ticket className="mr-2 h-6 w-6" />
          Ticketiv
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">"You can browse events without an account. Accounts are needed to host events."</p>
            <footer className="text-sm">Join Ticketiv Today</footer>
          </blockquote>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              You can browse events without an account. Accounts are needed to host events.
            </p>
          </div>

          <div className="grid gap-6">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 bg-green-50 text-green-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>Account created successfully! Redirecting...</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-3">
                  <Label>Account Type</Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(value) => setAccountType(value as AccountType)}
                    className="grid grid-cols-2 gap-4"
                    disabled={loading}
                  >
                    <div>
                      <RadioGroupItem value="attendee" id="attendee" className="peer sr-only" />
                      <Label
                        htmlFor="attendee"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                      >
                        <User className="mb-3 h-6 w-6" />
                        <div className="text-center">
                          <div className="font-semibold">Attendee</div>
                          <div className="text-xs text-muted-foreground">Book events</div>
                        </div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="organizer" id="organizer" className="peer sr-only" />
                      <Label
                        htmlFor="organizer"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                      >
                        <Building2 className="mb-3 h-6 w-6" />
                        <div className="text-center">
                          <div className="font-semibold">Organizer</div>
                          <div className="text-xs text-muted-foreground">Host events</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>

                {accountType === "organizer" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        type="text"
                        placeholder="Your Company Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="orgDescription">Organization Description (optional)</Label>
                      <Textarea
                        id="orgDescription"
                        placeholder="Tell us about your organization..."
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        disabled={loading}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading || success}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Account created!
                    </>
                  ) : (
                    `Create ${accountType} account`
                  )}
                </Button>
              </div>
            </form>
          </div>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
