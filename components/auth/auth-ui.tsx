import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

/** Error / notice boxes shared by the login, sign-up and organizer forms. */
export function AuthAlert({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  if (tone === "error") {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
        <Icon name="close" size={14} className="mt-0.5" />
        <span>{children}</span>
      </div>
    )
  }
  return (
    <div role="status" className="rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
      {children}
    </div>
  )
}

export function AuthNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
      <Icon name="check" size={14} className="mt-0.5 text-accent" />
      <span>{children}</span>
    </div>
  )
}

/** The small "1. … 2. …" card above each auth form. */
export function AuthSteps({ badge, steps }: { badge: string; steps: string[] }) {
  return (
    <Card flat className="bg-bg">
      <CardBody className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-3">
          {badge}
        </span>
        <ol className={`grid gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 ${steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {steps.map((step, i) => (
            <li key={step}>
              <span className="font-semibold text-ink">{i + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  )
}

export function AuthSwitchLinks({ mode }: { mode: "login" | "signup" | "organizer" }) {
  const toLogin = mode !== "login"
  return (
    <div className="space-y-2 text-center text-[13px] text-ink-3">
      <p>
        {mode === "organizer" ? "Already have a Ticketiv account?" : toLogin ? "Already have an account?" : "Need a Ticketiv account?"}{" "}
        <Link href={toLogin ? "/login" : "/signup"} className="font-semibold text-ink underline-offset-4 hover:underline">
          {toLogin ? "Log in" : "Sign up"}
        </Link>
      </p>
      {mode !== "organizer" && (
        <p>
          Planning to host an event?{" "}
          <Link href="/organizer/register" className="font-semibold text-ink underline-offset-4 hover:underline">
            Register as an organizer
          </Link>
        </p>
      )}
    </div>
  )
}
