"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { Logo } from "@/components/Logo"
import { createTalentProfileAction } from "./actions"

export default function TalentOnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("Enter your artist or performer name")
      return
    }
    setLoading(true)
    const result = await createTalentProfileAction({ name })
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    setDone(true)
    // Land on the talent profile — the Talent context's home.
    router.push(`/artists/${result.artistId}`)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Back to home
        </Link>
      </header>

      <section className="mt-12 flex flex-col gap-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Set up your talent profile</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
            Perform on Ticketiv.
          </h1>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Artist details</h2>
              <p className="text-[13px] text-ink-3">
                Create your performer profile so organisers can add you to line-ups and fans can follow
                you. You can add a bio and photo afterwards.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                  <Icon name="close" size={14} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <FormField
                label="Artist / performer name *"
                placeholder="e.g., DJ Sunset"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || done}
                required
                hint="This is how you appear on line-ups and your public profile."
              />

              <Button type="submit" variant="primary" size="md" disabled={loading || done} block>
                {loading ? "Creating…" : done ? "Done" : "Create talent profile"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card flat className="bg-bg">
          <CardBody>
            <p className="text-[12px] text-ink-3">
              Your buyer account stays exactly as it is — this just adds a Talent profile you can switch
              into from the context switcher.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  )
}
