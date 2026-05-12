"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuperAdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <Card className="w-full rounded-3xl border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Action could not be completed
          </CardTitle>
          <CardDescription>
            The backend rejected this request. Review the message below, correct the issue, and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-muted p-4 text-sm">
            {error.message || "Unexpected dashboard error"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} className="rounded-full">
              <RotateCcw className="mr-2 h-4 w-4" /> Try again
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/super-admin">Back to Command Centre</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
