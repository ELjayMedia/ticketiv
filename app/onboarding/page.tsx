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

  const { data: existing } = await supabase
    .from("user_handles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle()
    .then(async (res) => {
      if (res.data) return res
      return supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
    })

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header>
        <Logo />
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Last step</p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">
          Pick your handle.
        </h1>
        <p className="mt-3 max-w-sm text-[14px] leading-6 text-ink-3">
          This is how friends will find you when sharing tickets and RSVPs.
        </p>

        <div className="mt-8">
          <OnboardingForm initialDisplayName={profile?.display_name ?? ""} />
        </div>
      </section>
    </main>
  )
}
