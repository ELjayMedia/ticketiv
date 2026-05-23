import Link from "next/link"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Icon name="close" size={28} />
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="text-h1">Access denied</h1>
            <p className="text-[14px] text-ink-3">
              You don’t have permission to access this resource.
            </p>
          </div>

          <div className="flex w-full items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg p-3 text-left text-[12px] text-ink-3">
            <Icon name="settings" size={14} className="mt-0.5 shrink-0" />
            <p>
              This might be due to insufficient permissions, organisation membership, or the resource being unavailable.
            </p>
          </div>

          <div className="flex w-full gap-3">
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
            >
              Go home
            </Link>
            <Link
              href="/me"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              My account
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
