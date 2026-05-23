"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <Card className="w-full border-danger/30">
        <CardBody className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 text-h2">
              <Icon name="close" size={18} className="text-danger" />
              Action could not be completed
            </p>
            <p className="text-[13px] text-ink-3">
              The backend rejected this request. Review the message below, correct the issue, and try again.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-bg p-4 text-[13px] text-ink-2">
            {error.message || "Unexpected dashboard error"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} variant="primary" size="md">
              <Icon name="arrowR" size={14} /> Try again
            </Button>
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              Back to Command Centre
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
