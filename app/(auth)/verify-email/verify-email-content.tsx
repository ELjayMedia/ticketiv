"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle2, XCircle, Loader2, Clock, RefreshCw, Ticket } from "lucide-react"
import { createClient } from "@/lib/supabase"

type VerificationState = "sent" | "verified" | "expired" | "checking"

export default function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerificationState>("checking")
  const [email, setEmail] = useState<string>("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    checkVerificationStatus()
  }, [])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const checkVerificationStatus = async () => {
    const supabase = createClient()

    if (!supabase) {
      setState("sent")
      setEmail(searchParams.get("email") || "")
      return
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Session check error:", sessionError)
        setState("sent")
        return
      }

      if (session?.user) {
        if (session.user.email_confirmed_at) {
          setState("verified")

          // Check if user has org membership to determine redirect
          const { data: orgMember } = await supabase
            .from("org_members")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle()

          // Redirect after 2 seconds
          setTimeout(() => {
            if (orgMember?.role === "admin" || orgMember?.role === "organizer") {
              router.push("/dashboard")
            } else {
              router.push("/app/home")
            }
          }, 2000)
        } else {
          setState("sent")
          setEmail(session.user.email || "")
        }
      } else {
        setState("sent")
        setEmail(searchParams.get("email") || "")
      }
    } catch (error) {
      console.error("[v0] Verification check error:", error)
      setState("sent")
    }
  }

  const handleResendEmail = async () => {
    setResendLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const supabase = createClient()

    if (!supabase) {
      setErrorMessage("Email verification is not available in demo mode.")
      setResendLoading(false)
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        setErrorMessage("No email found. Please sign up again.")
        setResendLoading(false)
        return
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: session.user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes("rate limit")) {
          setErrorMessage("Too many requests. Please wait a minute before trying again.")
          setResendCooldown(60)
        } else {
          setErrorMessage(error.message || "Failed to resend verification email.")
        }
      } else {
        setSuccessMessage(`Verification email sent to ${session.user.email}`)
        setResendCooldown(60)
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side - Brand section */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Ticket className="mr-2 h-6 w-6" />
          Ticketiv
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "One more step to unlock your event experience. Check your inbox to verify your email and get started."
            </p>
            <footer className="text-sm">Welcome to Ticketiv</footer>
          </blockquote>
        </div>
      </div>

      {/* Right side - Verification status */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px] px-4">
          <Card>
            <CardHeader className="text-center">
              {state === "checking" && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <CardTitle>Checking verification status...</CardTitle>
                  <CardDescription>Please wait a moment</CardDescription>
                </>
              )}

              {state === "sent" && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Check your email</CardTitle>
                  <CardDescription>
                    {email ? `We sent a verification link to ${email}` : "We sent you a verification link"}
                  </CardDescription>
                </>
              )}

              {state === "verified" && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Email verified!</CardTitle>
                  <CardDescription>Your account is now active. Redirecting you...</CardDescription>
                </>
              )}

              {state === "expired" && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle>Link expired</CardTitle>
                  <CardDescription>The verification link has expired or is invalid</CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {state === "sent" && (
                <>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Click the link in the email to verify your account.</p>
                    <p>If you don&apos;t see it, check your spam folder.</p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleResendEmail}
                      disabled={resendLoading || resendCooldown > 0}
                      variant="outline"
                      className="w-full"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <Clock className="mr-2 h-4 w-4" />
                          Resend in {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend verification email
                        </>
                      )}
                    </Button>

                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/login">Back to sign in</Link>
                    </Button>
                  </div>
                </>
              )}

              {state === "expired" && (
                <div className="space-y-2">
                  <Button onClick={handleResendEmail} disabled={resendLoading || resendCooldown > 0} className="w-full">
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Wait {resendCooldown}s
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Request new verification link
                      </>
                    )}
                  </Button>

                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <Link href="/login">Back to sign in</Link>
                  </Button>
                </div>
              )}

              {state === "verified" && (
                <div className="text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Taking you to your dashboard...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/contact" className="underline underline-offset-4 hover:text-primary">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
