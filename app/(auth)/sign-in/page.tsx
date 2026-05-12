import Link from "next/link"
import { Suspense } from "react"
import { Logo } from "@/components/Logo"
import { SignInForm } from "@/components/SignInForm"

export const metadata = { title: "Log in" }

export default function SignInPage() {
  return (
    <main className="relative z-10 mx-auto grid min-h-dvh max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
      <section className="hidden rounded-[2rem] border bg-card/80 p-10 shadow-sm backdrop-blur lg:block">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo />
        </Link>
        <div className="mt-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Welcome back</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Log in to your Ticketiv ID.</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            Access your tickets, event tools, scanning permissions and talent profiles through the same Supabase Auth UUID.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <header className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </header>

        <div data-reveal>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Log in</p>
          <h1 className="mt-3 text-[2.35rem] font-bold leading-[1.05] tracking-tight">Let’s get you in.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use your email address. Login will not create a new account.
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <SignInForm mode="login" />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  )
}
