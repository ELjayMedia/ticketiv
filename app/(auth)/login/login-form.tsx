"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"

import { initialAuthState, login, type AuthState } from "./actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  )
}

export function LoginForm() {
  const [formState, formAction] = useFormState<AuthState, FormData>(login, initialAuthState)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const fillDemo = () => {
    setEmail("demo@ticketiv.com")
    setPassword("demo123456")
  }

  return (
    <>
      <form action={formAction} className="space-y-4">
        {formState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formState.error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitButton />
      </form>

      <Button variant="outline" className="w-full mt-2 bg-transparent" onClick={fillDemo} type="button">
        Use Demo Credentials
      </Button>
    </>
  )
}
