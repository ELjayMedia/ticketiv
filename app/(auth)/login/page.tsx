"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ticket, AlertCircle } from "lucide-react"
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
      if (!email || !password) {
        setError("Please fill in all fields")
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        throw signInError
      }

      router.push("/browse")
    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail("demo@ticketiv.com")
    setPassword("demo123456")
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Ticket className="w-8 h-8 text-primary" />
        <span className="text-3xl font-bold text-primary">Ticketiv</span>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Ticketiv account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <Button variant="outline" className="w-full mt-2 bg-transparent" onClick={fillDemo} type="button">
            Use Demo Credentials
          </Button>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
