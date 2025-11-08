import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket } from "lucide-react"

import { SignupForm } from "./signup-form"

export default function SignupPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Ticket className="w-8 h-8 text-primary" />
        <span className="text-3xl font-bold text-primary">Ticketiv</span>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Get started</CardTitle>
          <CardDescription>Create your Ticketiv account to start booking events</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
