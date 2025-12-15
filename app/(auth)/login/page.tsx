"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ticket, AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { isDemoCredentials, setDemoSession } from "@/lib/demo-auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!email.trim() || !password.trim()) {
        setError("Please fill in all fields")
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters")
        return
      }

      const demoUser = isDemoCredentials(email.trim(), password)
      if (demoUser) {
        setDemoSession(demoUser)
        console.log("[v0] Demo login successful for:", demoUser.email)

        // Force a full page navigation to ensure server components see the demo session
        if (demoUser.role === "organizer") {
          window.location.href = "/org"
        } else if (demoUser.role === "staff") {
          window.location.href = "/scanner"
        } else {
          window.location.href = "/app"
        }
        return
      }

      const supabase = createClient()

      if (!supabase) {
        setError("Authentication service is not configured. Use demo credentials: demo@ticketiv.com / demo123456")
        return
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.")
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please confirm your email address before logging in. Check your inbox for a confirmation link.")
        } else if (signInError.message.includes("Email link is invalid")) {
          setError("This login link has expired. Please request a new one.")
        } else {
          setError(signInError.message || "Login failed. Please try again.")
        }
        console.error("[v0] Login error:", signInError)
        return
      }

      if (!authData.user) {
        setError("Login failed. Please try again.")
        return
      }

      const { data: orgMember } = await supabase
        .from("org_members")
        .select("role, org_id")
        .eq("user_id", authData.user.id)
        .maybeSingle()

      if (orgMember && (orgMember.role === "admin" || orgMember.role === "organizer")) {
        console.log("[v0] Organizer login successful, redirecting to /org")
        router.push("/org")
      } else {
        // Check if user is staff/scanner
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle()

        if (profile?.role === "staff") {
          console.log("[v0] Staff login successful, redirecting to /scanner")
          router.push("/scanner")
        } else {
          console.log("[v0] Attendee login successful, redirecting to /app")
          router.push("/app")
        }
      }
    } catch (err: any) {
      const message = err?.message || "An unexpected error occurred"
      setError(message)
      console.error("[v0] Login exception:", err)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail("demo@ticketiv.com")
    setPassword("demo123456")
  }

  const fillOrganizer = () => {
    setEmail("organizer@ticketiv.com")
    setPassword("organizer123456")
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side - Brand/Image section */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Ticket className="mr-2 h-6 w-6" />
          Ticketiv
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Ticketiv has revolutionized how we manage events. The seamless ticketing experience and powerful
              analytics have made our events more successful than ever."
            </p>
            <footer className="text-sm">Event Organizer</footer>
          </blockquote>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Enter your email to sign in to your account</p>
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

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or try demo accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={fillDemo} type="button" disabled={loading}>
                Demo Attendee
              </Button>
              <Button variant="outline" onClick={fillOrganizer} type="button" disabled={loading}>
                Demo Organizer
              </Button>
            </div>
          </div>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
