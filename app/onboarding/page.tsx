import { redirect } from "next/navigation"
import { Logo } from "@/components/Logo"
import { OnboardingForm } from "@/components/OnboardingForm"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Choose your handle" }
export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // If they already completed onboarding, middleware should have caught this,
  // but be defensive in case they navigate here directly.
  const { data: existing } = await supabase
    .from("user_handles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) redirect("/")

  // Try both profile schema versions (user_id FK and id PK)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle()
    .then(async (res) => {
      if (res.data) return res
      return supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    })

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header>
        <Logo />
      </header>

      <section data-reveal className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
          Last step
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Pick your handle.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-ink-soft)]">
          This is how friends will find you when sharing tickets and RSVPs.
        </p>

        <div className="mt-8">
          <OnboardingForm initialDisplayName={profile?.display_name ?? ""} />
        </div>
      </section>
    </main>
  )
}
