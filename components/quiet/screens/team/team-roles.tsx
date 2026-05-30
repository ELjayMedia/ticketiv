"use client"

// Quiet · Team & roles (organizer console)
// Pixel-faithful port of QuietDeskTeam.

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

export interface TeamRolesProps {
  orgId: string
  orgName: string
  members: Array<{
    id: string
    name: string
    avatar?: string | null
    isDevice?: boolean
    role: string
    eventsScope: string
    joinedLabel: string
    lastActiveLabel: string
    flag?: "never_logged_in"
  }>
  pendingInvites: number
}

const PERMISSIONS_MATRIX: Array<[string, string[]]> = [
  ["Create / publish events", ["✓", "✓", "scope", "", "", ""]],
  ["Manage ticket types", ["✓", "✓", "scope", "", "", ""]],
  ["Issue refunds", ["✓", "✓", "scope", "", "", "✓"]],
  ["Request payouts", ["✓", "", "", "", "", ""]],
  ["Manage team", ["✓", "", "", "", "", ""]],
  ["Scan tickets", ["✓", "✓", "scope", "✓", "", ""]],
  ["Sell at door", ["✓", "✓", "scope", "", "✓", ""]],
  ["View analytics", ["✓", "✓", "scope", "", "", "read"]],
]

const ROLE_COLUMNS = ["owner", "admin", "event_admin", "scanner", "pos", "support"]

function roleBadgeClass(role: string): string {
  if (role.includes("owner")) return "bg-accent-soft text-accent"
  if (role.includes("admin") || role === "pos") return "bg-accent-soft text-accent"
  if (role === "scanner" || role === "organizer_scanner") return "bg-[#f3f1ee] text-ink-2"
  return "bg-[#f3f1ee] text-ink-3"
}

export function TeamRoles({ orgId, orgName, members, pendingInvites }: TeamRolesProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [permissionsOpen, setPermissionsOpen] = React.useState(false)

  const filtered = search.trim()
    ? members.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase())
      )
    : members

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      {/* Header */}
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">OPS / TEAM</div>
          <h1 className="text-h1 mt-1">Team &amp; roles</h1>
          <div className="font-mono text-[11px] text-ink-3 mt-0.5">{orgName}</div>
        </div>
        <Button variant="accent" size="xs" onClick={() => router.push(`/orgs/${orgId}/team/invite`)}>
          <Icon name="plus" size={12} /> Invite member
        </Button>
      </div>

      {/* Members */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div className="flex flex-col">
            <span className="text-h3">Members</span>
            <span className="font-mono text-[11px] text-ink-3">
              {members.length} active{pendingInvites > 0 && ` · ${pendingInvites} pending invite${pendingInvites > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex w-56 items-center gap-1.5 rounded-md border border-line-2 bg-bg px-2.5 py-1.5">
            <Icon name="search" size={14} className="text-ink-3 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filter members"
              className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3"
            />
          </div>
        </div>
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_0.8fr_0.8fr_16px] gap-2.5 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Member</span><span>Role</span><span>Events scoped</span><span>Joined</span><span>Last active</span><span />
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs text-ink-3">
            {search ? "No members match your search." : "No team members yet."}
          </div>
        ) : (
          filtered.map((m, i) => (
            <div
              key={m.id}
              onClick={() => router.push(`/orgs/${orgId}/team/${m.id}`)}
              className={`grid grid-cols-[2fr_1.2fr_1.2fr_0.8fr_0.8fr_16px] items-center gap-2.5 cursor-pointer px-4 py-3 text-sm hover:bg-bg ${
                i < filtered.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                {m.isDevice ? (
                  <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink text-white">
                    <Icon name="qr" size={13} />
                  </span>
                ) : m.avatar ? (
                  <img src={m.avatar} alt="" className="h-[26px] w-[26px] rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                    {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                )}
                <span className="font-semibold">{m.name}</span>
                {m.flag === "never_logged_in" && (
                  <span className="rounded bg-[#fdf6ed] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#c1841c]">
                    NEVER LOGGED IN
                  </span>
                )}
              </div>
              <span className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${roleBadgeClass(m.role)}`}>
                {m.role}
              </span>
              <span className="font-mono text-[11px] text-ink-3">{m.eventsScope}</span>
              <span className="font-mono text-[11px] text-ink-3">{m.joinedLabel}</span>
              <span className="font-mono text-[11px] text-ink-3">{m.lastActiveLabel}</span>
              <Icon name="chevR" size={14} className="text-ink-3" />
            </div>
          ))
        )}
      </Card>

      {/* Permissions matrix */}
      <Card className="p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-h2">Role permissions</span>
            <span className="font-mono text-[11px] text-ink-3">13 platform actors · app_role enum</span>
          </div>
          <Button variant="default" size="xs" onClick={() => setPermissionsOpen(true)}>View all permissions</Button>
        </div>
        <div className="grid grid-cols-[2fr_repeat(6,1fr)] gap-2 border-b border-line py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Capability</span>
          {ROLE_COLUMNS.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
        {PERMISSIONS_MATRIX.map(([cap, vals], i, arr) => (
          <div
            key={cap}
            className={`grid grid-cols-[2fr_repeat(6,1fr)] items-center gap-2 py-2.5 text-xs ${
              i < arr.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span className="font-medium">{cap}</span>
            {vals.map((v, j) => (
              <span
                key={j}
                className={`font-mono text-[11px] font-semibold ${
                  v === "✓"
                    ? "text-accent"
                    : v === "scope" || v === "read"
                      ? "text-ink-3"
                      : "text-line-2"
                }`}
              >
                {v || "—"}
              </span>
            ))}
          </div>
        ))}
      </Card>

      {permissionsOpen && (
        <PermissionsModal onClose={() => setPermissionsOpen(false)} />
      )}
    </div>
  )
}

function PermissionsModal({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onEsc)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onEsc)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const ALL_ROLES = ["owner", "admin", "event_admin", "scanner", "pos", "support", "staff", "member"]
  const ALL_CAPABILITIES: Array<[string, string[]]> = [
    ...PERMISSIONS_MATRIX,
    ["View events", ["✓", "✓", "scope", "✓", "✓", "✓", "✓", "✓"]],
    ["View guestlist", ["✓", "✓", "scope", "✓", "", "✓", "", ""]],
    ["Manage devices", ["✓", "✓", "", "", "", "", "", ""]],
    ["Manage integrations", ["✓", "✓", "", "", "", "", "", ""]],
    ["Bulk export", ["✓", "✓", "", "", "", "read", "", ""]],
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All permissions"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-elev)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[18px] font-semibold">All role permissions</h2>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">Full capability matrix for all 8 platform roles</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-line/60"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="overflow-auto p-6">
          <div className="grid grid-cols-[2fr_repeat(8,1fr)] gap-2 border-b border-line pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
            <span>Capability</span>
            {ALL_ROLES.map((r) => <span key={r}>{r}</span>)}
          </div>
          {ALL_CAPABILITIES.map(([cap, vals], i, arr) => (
            <div
              key={cap}
              className={`grid grid-cols-[2fr_repeat(8,1fr)] items-center gap-2 py-2.5 text-xs ${i < arr.length - 1 ? "border-b border-line" : ""}`}
            >
              <span className="font-medium">{cap}</span>
              {Array.from({ length: 8 }, (_, j) => vals[j] ?? "").map((v, j) => (
                <span
                  key={j}
                  className={`font-mono text-[11px] font-semibold ${v === "✓" ? "text-accent" : v === "scope" || v === "read" ? "text-ink-3" : "text-line-2"}`}
                >
                  {v || "—"}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
