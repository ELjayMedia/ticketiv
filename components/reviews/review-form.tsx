"use client"

import { useActionState, type ReactNode } from "react"
import { saveReview, type ReviewAction } from "./actions"

export function ReviewForm({ action, target, slug = "", children, label }: {
  action: ReviewAction; target: string; slug?: string; children: ReactNode; label: string
}) {
  const [message, submit, pending] = useActionState(saveReview.bind(null, action, target, slug), "")
  return <form action={submit} className="grid max-w-xl gap-3 py-2">
    {children}
    <button disabled={pending} className="w-fit rounded border border-line px-3 py-2">{pending ? "Saving…" : label}</button>
    <span role="status">{message}</span>
  </form>
}
