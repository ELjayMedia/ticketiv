import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Create account" }

export default function SignupPage() {
  return (
    <main className="relative z-10 mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[2rem] border bg-card/80 p-10 shadow-sm backdrop-blur lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Ticketiv ID</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Create your account in two quick steps.</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            Start with your email, verify the 6-digit code, then use the same Ticketiv ID for tickets, event access, organiser tools and staff permissions when they are assigned to you.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="font-medium text-foreground">1. Enter your email</p>
              <p className="mt-1">No password is needed for the MVP.</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="font-medium text-foreground">2. Verify your code</p>
              <p className="mt-1">Use the latest code sent by Supabase to finish creating your profile.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </header>

        <div data-reveal>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Create your account</p>
          <h1 className="mt-3 text-[2.35rem] font-bold leading-[1.05] tracking-tight">Join Ticketiv.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter your email to receive a 6-digit verification code. Your first role is Attendee; more access is unlocked when your account is linked to events, staff or talent records.
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <SignInForm mode="signup" />
            </Suspense>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            By creating an account you agree to Ticketiv’s terms of service. Avoid requesting multiple codes in a row to prevent email rate limits.
          </p>
        </div>
      </section>
    </main>
  )
}
