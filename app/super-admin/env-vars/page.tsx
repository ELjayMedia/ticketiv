import { requireAdminRole } from "@/lib/super-admin/auth"

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
            Ticketiv production configuration is managed in Coolify. Secret values are never copied into this console or sent to the browser.
          </p>
        </div>
        <p className="w-fit rounded-full border border-line bg-bg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
          Signed in as {user.email ?? "Super Admin"}
        </p>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Production source of truth</p>
          <h2 className="text-h2">Coolify environment</h2>
          <p className="max-w-3xl text-[13px] text-ink-3">
            Add or rotate variables on the Ticketiv application in Coolify, then redeploy the application so build-time and runtime values stay on the same revision.
          </p>
          <a
            className="mt-1 w-fit rounded-[var(--radius-md)] bg-ink px-4 py-2 text-[13px] font-medium text-bg transition-opacity hover:opacity-85"
            href="https://coolify.eljaymedia.com"
            rel="noreferrer"
            target="_blank"
          >
            Open Coolify
          </a>
        </div>
      </section>
    </div>
  )
}
