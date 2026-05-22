// Quiet · Team & roles (organizer console)
// Pixel-faithful port of QuietDeskTeam.

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

export interface TeamRolesProps {
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

export function TeamRoles({ orgName, members, pendingInvites }: TeamRolesProps) {
  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      {/* Header */}
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">OPS / TEAM</div>
          <h1 className="text-h1 mt-1">Team &amp; roles</h1>
          <div className="font-mono text-[11px] text-ink-3 mt-0.5">{orgName}</div>
        </div>
        <Button variant="accent" size="xs">
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
            <Icon name="search" size={14} className="text-ink-3" />
            <span className="text-xs text-ink-3">filter members</span>
          </div>
        </div>
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_0.8fr_0.8fr_16px] gap-2.5 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Member</span><span>Role</span><span>Events scoped</span><span>Joined</span><span>Last active</span><span />
        </div>
        {members.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs text-ink-3">
            No team members yet.
          </div>
        ) : (
          members.map((m, i) => (
            <div
              key={m.id}
              className={`grid grid-cols-[2fr_1.2fr_1.2fr_0.8fr_0.8fr_16px] items-center gap-2.5 px-4 py-3 text-sm ${
                i < members.length - 1 ? "border-b border-line" : ""
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
          <Button variant="default" size="xs">View all permissions</Button>
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
    </div>
  )
}
