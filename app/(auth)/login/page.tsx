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
        setError("Please enter both email and password")
        setLoading(false)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        setLoading(false)
        return
      }

      const supabase = createClient()

      if (!supabase) {
        setError("Authentication is not configured. Please contact support.")
        setLoading(false)
        return
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password. Please try again.")
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please verify your email address. Check your inbox for a confirmation link.")
        } else {
          setError("Unable to sign in. Please check your credentials and try again.")
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Sign in failed. Please try again.")
        setLoading(false)
        return
      }

      const { data: orgMember } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle()

      if (orgMember?.role === "admin" || orgMember?.role === "organizer") {
        router.push(orgMember.org_id ? `/orgs/${orgMember.org_id}/dashboard` : "/dashboard")
      } else {
        router.push("/")
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Ticket className="mr-2 h-6 w-6" />
          Ticketiv
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Ticketiv has transformed how we sell tickets. Simple, fast, and reliable."
            </p>
            <footer className="text-sm">Event Organiser, Mbabane</footer>
          </blockquote>
        </div>
      </div>

      {/* Right side */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your Ticketiv account</p>
          </div>

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
                  placeholder="you@example.com"
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
                    Forgot password?
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
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>

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
