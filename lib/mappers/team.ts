// Shape OrgTeam → TeamRoles props.

import type { OrgTeam } from "@/lib/data/organizer/team"
import type { TeamRolesProps } from "@/components/quiet/screens/team/team-roles"

const JOINED_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" })

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return JOINED_FMT.format(new Date(iso))
}

export function mapTeam(team: OrgTeam, orgId: string): TeamRolesProps {
  return {
    orgId,
    orgName: team.orgName,
    members: team.active.map((m) => ({
      id: m.user_id ?? `device-${m.display_name}`,
      name: m.display_name,
      avatar: null,
      isDevice: m.user_id === null,
      role: m.role,
      eventsScope: m.events_scope,
      joinedLabel: m.joined_at ? JOINED_FMT.format(new Date(m.joined_at)) : "—",
      lastActiveLabel: m.last_active_at ? timeAgo(m.last_active_at) : "—",
      flag: m.flag,
    })),
    pendingInvites: team.pendingInvites,
  }
}
