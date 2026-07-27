"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect, useState } from "react"

const RELOAD_FLAG = "tk_global_chunk_reload"

function isStaleChunkError(error: Error) {
  const text = `${error.name} ${error.message}`
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [^ ]+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text)
  )
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    console.error("[ticketiv] Global error boundary caught:", error)
    Sentry.captureException(error, { tags: { area: "global-error-boundary" } })

    if (!isStaleChunkError(error)) {
      try {
        sessionStorage.removeItem(RELOAD_FLAG)
      } catch {
        // Storage can be unavailable in private/restricted browser contexts.
      }
      return
    }

    let alreadyReloaded = false
    try {
      alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1"
      if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, "1")
    } catch {
      // Make one best-effort reload when storage cannot be used.
    }

    if (!alreadyReloaded) {
      setReloading(true)
      window.location.reload()
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#171717" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 520, border: "1px solid #e5e5e5", borderRadius: 12, background: "white", padding: 32 }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#737373" }}>
              {reloading ? "Updating Ticketiv" : "Ticketiv error"}
            </p>
            <h1 style={{ margin: "12px 0 0", fontSize: 24 }}>
              {reloading ? "Loading the latest version…" : "Something went wrong"}
            </h1>
            {!reloading && (
              <>
                <p style={{ margin: "12px 0 0", lineHeight: 1.6, color: "#525252" }}>
                  Refresh the page to retry. If the problem continues, share the error details below with Ticketiv support.
                </p>
                <pre style={{ margin: "16px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", borderRadius: 8, background: "#f5f5f5", padding: 12, fontSize: 11, color: "#525252" }}>
                  {[error.name, error.message, error.digest ? `Error ID: ${error.digest}` : null].filter(Boolean).join("\n").slice(0, 500)}
                </pre>
                <button
                  type="button"
                  onClick={() => reset()}
                  style={{ marginTop: 20, border: 0, borderRadius: 8, background: "#111827", color: "white", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}
                >
                  Try again
                </button>
              </>
            )}
          </section>
        </main>
      </body>
    </html>
  )
}
