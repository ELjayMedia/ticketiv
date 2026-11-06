import { changeAdminRoleAction, inviteAdminAction, removeAdminAccessAction, resendAdminInviteAction } from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { ChangeRoleForm, InviteAdminForm, RowActionForm } from "@/components/super-admin/TeamForms"
import { listAdminTeam } from "@/lib/data/admin/console"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_LABELS, CONSOLE_ACTION_ROLES, type AdminRoleTier, type ConsoleAction } from "@/lib/super-admin/console"

export const metadata = { title: "Team & access · Admin" }

const MATRIX: Array<{ label: string; action: ConsoleAction }> = [
  { label: "Resend tickets", action: "resend_tickets" },
  { label: "Change buyer email", action: "change_buyer_email" },
  { label: "Reissue a ticket", action: "reissue_ticket" },
  { label: "Request a refund", action: "request_refund" },
  { label: "Send password reset", action: "send_password_reset" },
  { label: "Sign someone out everywhere", action: "sign_out_everywhere" },
  { label: "Add notes", action: "add_note" },
  { label: "Invite admins, change roles", action: "manage_team" },
]
const ROLES: AdminRoleTier[] = ["super_admin", "support_admin", "finance_admin", "event_ops_admin", "read_only_admin"]

export default async function AdminTeamPage() {
  const { user } = await requireAdminRole(["super_admin"])
  const team = await listAdminTeam()
  const active = team.filter((member) => member.active)
  const removed = team.filter((member) => !member.active)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Team and access</h1>
        <p className="text-sm text-ink-3">
          Everyone gets their own login and a role. Nobody shares the owner account, and every console action is logged under the person
          who did it.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Admins" aside={`${active.length} with access`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="py-2 pr-3 font-semibold">Person</th>
                    <th className="py-2 pr-3 font-semibold">Role</th>
                    <th className="py-2 pr-3 font-semibold">Last active</th>
                    <th className="py-2 font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((member) => {
                    const self = member.userId === user.id
                    const owner = member.role === "super_admin"
                    return (
                      <tr key={member.userId} className="border-t border-line align-top">
                        <td className="py-3 pr-3">
                          <span className="block font-semibold text-ink">{member.email ?? member.userId}</span>
                          <span className="flex flex-wrap gap-1 pt-1">
                            {member.pending ? <Pill tone="warning">Hasn&apos;t signed in yet</Pill> : null}
                            {member.mfa ? <Pill tone="success">Two-step on</Pill> : null}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          {self || owner ? (
                            ADMIN_ROLE_LABELS[member.role as AdminRoleTier] ?? member.role
                          ) : (
                            <ChangeRoleForm action={changeAdminRoleAction} userId={member.userId} role={member.role} />
                          )}
                        </td>
                        <td className="py-3 pr-3 text-ink-3">{member.pending ? `Added ${when(member.addedAt)}` : when(member.lastSignInAt)}</td>
                        <td className="py-3">
                          {self ? (
                            <span className="text-[13px] text-ink-3">This is you</span>
                          ) : (
                            <div className="flex flex-wrap justify-end gap-2">
                              {member.pending ? <RowActionForm action={resendAdminInviteAction} userId={member.userId} label="Resend invite" /> : null}
                              {owner ? null : <RowActionForm action={removeAdminAccessAction} userId={member.userId} label="Remove access" />}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {removed.length ? (
              <p className="pt-3 text-[13px] text-ink-3">
                Access removed: {removed.map((member) => member.email ?? member.userId).join(", ")}. Invite them again to restore it.
              </p>
            ) : null}
          </Panel>

          <Panel title="What each role can do">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="py-2 pr-3 font-semibold">Action</th>
                    {ROLES.map((role) => (
                      <th key={role} className="py-2 pr-3 font-semibold">
                        {ADMIN_ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.action} className="border-t border-line">
                      <td className="py-2 pr-3 text-ink">{row.label}</td>
                      {ROLES.map((role) => (
                        <td key={role} className="py-2 pr-3">
                          {CONSOLE_ACTION_ROLES[row.action].includes(role) ? <span className="font-semibold text-success">Yes</span> : <span className="text-ink-3">No</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pt-3 text-[13px] text-ink-3">
              Every role can search and view people, orders and events. Refund requests are approved through the usual refund flow before money
              moves.
            </p>
          </Panel>
        </div>

        <Panel title="Invite an admin">
          <InviteAdminForm action={inviteAdminAction} />
        </Panel>
      </div>
    </div>
  )
}
