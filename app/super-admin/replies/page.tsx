import { deleteReplyAction, saveReplyAction } from "@/app/super-admin/console-actions"
import { Panel, when } from "@/components/super-admin/console-ui"
import { DeleteReplyForm, SavedReplyForm } from "@/components/super-admin/CaseForms"
import { listSavedReplies } from "@/lib/data/admin/console-ops"
import { requireAdminRole } from "@/lib/super-admin/auth"

export const metadata = { title: "Saved replies · Admin" }

export default async function SavedRepliesPage() {
  await requireAdminRole(["super_admin", "support_admin"])
  const replies = await listSavedReplies()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Saved replies</h1>
        <p className="text-sm text-ink-3">Answers you give often. They appear above the reply box in Cases; one click fills it in, and you can edit before sending.</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {replies.map((reply) => (
            <Panel key={reply.id} title={reply.title} aside={`Updated ${when(reply.updatedAt)}`}>
              <div className="flex flex-col gap-2">
                <SavedReplyForm action={saveReplyAction} reply={reply} />
                <DeleteReplyForm action={deleteReplyAction} replyId={reply.id} />
              </div>
            </Panel>
          ))}
          {replies.length === 0 ? (
            <Panel>
              <p className="text-[13px] text-ink-3">No saved replies yet. Good first ones: tickets resent, refund timing, and asking for the order number.</p>
            </Panel>
          ) : null}
        </div>
        <Panel title="Add a reply">
          <SavedReplyForm action={saveReplyAction} />
        </Panel>
      </div>
    </div>
  )
}
