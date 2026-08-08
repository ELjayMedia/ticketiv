"use client"

import { useState } from "react"

import { Button } from "@/components/quiet/ui/button"

class SentryExampleBrowserError extends Error {
  constructor() {
    super("Sentry delivery check — browser error (safe to resolve)")
    this.name = "SentryExampleBrowserError"
  }
}

export function SentryExampleClient() {
  const [serverResult, setServerResult] = useState<string | null>(null)

  return (
    <div className="mt-6 space-y-3">
      <Button
        variant="primary"
        size="md"
        onClick={() => {
          // Thrown outside React's render/commit cycle, so the error boundary
          // does not swallow it — the browser SDK's global handler picks it up.
          setTimeout(() => {
            throw new SentryExampleBrowserError()
          })
        }}
      >
        Throw a browser error
      </Button>

      <Button
        variant="outline"
        size="md"
        onClick={async () => {
          setServerResult("Calling…")
          try {
            const response = await fetch("/api/sentry-example-api", { cache: "no-store" })
            setServerResult(
              response.ok
                ? `Unexpected ${response.status} — the route should always fail`
                : `Server responded ${response.status}. Look for the issue in Sentry.`,
            )
          } catch (error) {
            setServerResult(error instanceof Error ? error.message : "Request failed")
          }
        }}
      >
        Throw a server error
      </Button>

      {serverResult ? <p className="text-sm text-ink-3">{serverResult}</p> : null}
    </div>
  )
}
