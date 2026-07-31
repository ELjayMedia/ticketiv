import Link from "next/link"

import { Logo } from "@/components/Logo"
import { OrganizerPasswordForm } from "@/components/OrganizerPasswordForm"

export const metadata = { title: "Secure your organizer account" }

export default function OrganizerSetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Back to home"><Logo /></Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Organizer account security</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Choose your Ticketiv password.</h1>
        <p className="mt-3 text-[13px] leading-5 text-ink-3">
          Your organizer email is verified. Set the password you will use for future logins, then Ticketiv will create the organizer profile and continue to setup.
        </p>

        <div className="mt-8"><OrganizerPasswordForm /></div>
      </section>
    </main>
  )
}
