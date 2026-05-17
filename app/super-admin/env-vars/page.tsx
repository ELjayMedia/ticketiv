import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { EnvVarsClient } from "./env-vars-client"

export const metadata = { title: "Environment Variables" }

export default async function EnvVarsPage() {
  const user = await requireSuperAdmin()

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:flex md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Super admin control</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Environment Variables</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Read, create, update and delete the Vercel environment variables for the Ticketiv project.
            Secret values are never shown.
          </p>
        </div>
        <p className="mt-4 rounded-full border px-3 py-1.5 text-xs text-muted-foreground md:mt-0">
          Signed in as {user.email ?? "Super Admin"}
        </p>
      </section>

      <EnvVarsClient />
    </div>
  )
}
