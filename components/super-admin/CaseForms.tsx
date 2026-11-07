"use client"

import { useActionState, useId, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label, Textarea } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

function Result({ state }: { state: ConsoleActionResult }) {
  if (state.status === "idle") return null
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn("rounded-md px-3 py-2 text-[13px]", state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}
    >
      {state.message}
    </p>
  )
}

/** Reply box under a Chatwoot conversation, with saved replies one click away. */
export function CaseReplyForm({
  action,
  conversationId,
  replies,
}: {
  action: ServerAction
  conversationId: number
  replies: Array<{ id: string; title: string; body: string }>
}) {
  const [content, setContent] = useState("")
  const [isNote, setIsNote] = useState(false)
  const [state, formAction, pending] = useActionState(async (prev: ConsoleActionResult, formData: FormData) => {
    const result = await action(prev, formData)
    if (result.status === "done") setContent("")
    return result
  }, IDLE_RESULT)
  const id = useId()

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      {isNote ? <input type="hidden" name="private" value="1" /> : null}
      {replies.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-3">Saved replies:</span>
          {replies.map((reply) => (
            <button
              key={reply.id}
              type="button"
              onClick={() => setContent(reply.body)}
              className="min-h-[36px] rounded-full border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink-2 hover:bg-bg"
            >
              {reply.title}
            </button>
          ))}
        </div>
      ) : null}
      <Label htmlFor={`${id}-reply`}>{isNote ? "Internal note (only agents see it)" : "Reply"}</Label>
      <Textarea
        id={`${id}-reply`}
        name="content"
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={4000}
        placeholder={isNote ? "Leave a note for the team in Chatwoot" : "Sent through Chatwoot, so the customer sees it where they wrote to us"}
        className={isNote ? "bg-warning-soft/50" : undefined}
      />
      <Result state={state} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={isNote} onChange={(event) => setIsNote(event.target.checked)} className="size-4" />
          Internal note
        </label>
        <Button type="submit" variant="accent" size="sm" disabled={!content.trim() || pending}>
          {pending ? "Sending…" : isNote ? "Add note" : "Send via Chatwoot"}
        </Button>
      </div>
    </form>
  )
}

export function ResolveCaseForm({ action, conversationId }: { action: ServerAction; conversationId: number }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Resolving…" : "Resolve"}
      </Button>
      <Result state={state} />
    </form>
  )
}

/** Add or edit a saved reply. */
export function SavedReplyForm({
  action,
  reply,
}: {
  action: ServerAction
  reply?: { id: string; title: string; body: string }
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const id = useId()
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {reply ? <input type="hidden" name="id" value={reply.id} /> : null}
      <Label htmlFor={`${id}-title`}>Title</Label>
      <Input id={`${id}-title`} name="title" defaultValue={reply?.title} maxLength={80} required placeholder="e.g. Tickets resent" />
      <Label htmlFor={`${id}-body`}>Reply</Label>
      <Textarea id={`${id}-body`} name="body" defaultValue={reply?.body} rows={4} maxLength={2000} required />
      <Result state={state} />
      <Button type="submit" variant={reply ? "outline" : "accent"} size="sm" disabled={pending}>
        {pending ? "Saving…" : reply ? "Save changes" : "Add reply"}
      </Button>
    </form>
  )
}

export function DeleteReplyForm({ action, replyId }: { action: ServerAction; replyId: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={replyId} />
      <Button type="submit" variant="ghost" size="xs" disabled={pending}>
        Delete
      </Button>
      <Result state={state} />
    </form>
  )
}
