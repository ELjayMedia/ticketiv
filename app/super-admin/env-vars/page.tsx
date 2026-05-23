import { requireAdminRole } from "@/lib/super-admin/auth"
import { EnvVarsClient } from "./env-vars-client"

export const metadata = { title: "Environment Variables" }

export default async function EnvVarsPage() {
  const { user } = await requireAdminRole(["super_admin"])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Super admin control</p>
          <h1 className="text-h1">Environment variables</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Read, create, update and delete the Vercel environment variables for the Ticketiv project. Secret values are never shown.
          </p>
        </div>
        <p className="w-fit rounded-full border border-line bg-bg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
          Signed in as {user.email ?? "Super Admin"}
        </p>
      </section>

      <EnvVarsClient />
    </div>
  )
}
