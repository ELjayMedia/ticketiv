import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket } from "lucide-react"

import { LoginForm } from "./login-form"

export default function LoginPage() {
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
          <LoginForm />

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
