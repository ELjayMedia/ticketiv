"use client"

import { useActionState, useId } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
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

/**
 * Chatwoot connection. The token field is write-only: the saved token is never
 * sent to the browser, only its last 4 characters as a hint.
 */
export function ChatwootSettingsForm({
  action,
  baseUrl,
  accountId,
  tokenHint,
  hasSavedToken,
}: {
  action: ServerAction
  baseUrl: string
  accountId: string
  tokenHint: string | null
  hasSavedToken: boolean
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const id = useId()

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-url`}>Chatwoot address</Label>
        <Input id={`${id}-url`} name="baseUrl" type="url" required defaultValue={baseUrl} placeholder="https://chat.yourdomain.com" autoComplete="off" />
        <span className="text-xs text-ink-3">The address you open Chatwoot at. https only.</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-account`}>Account ID</Label>
        <Input id={`${id}-account`} name="accountId" inputMode="numeric" required defaultValue={accountId} placeholder="e.g. 1" autoComplete="off" />
        <span className="text-xs text-ink-3">The number after /accounts/ in Chatwoot&apos;s address bar.</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-token`}>Access token</Label>
        <Input
          id={`${id}-token`}
          name="token"
          type="password"
          required={!hasSavedToken}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={hasSavedToken ? `Saved${tokenHint ? `, ends in ${tokenHint}` : ""}. Leave empty to keep it` : "Paste the access token"}
        />
        <span className="text-xs text-ink-3">
          In Chatwoot: Profile settings › Access token. Use an agent who can see every inbox. It&apos;s stored encrypted and never shown again.
        </span>
      </div>
      <Result state={state} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Testing the connection…" : "Test and save"}
      </Button>
    </form>
  )
}

export function DisconnectForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Disconnecting…" : "Disconnect and delete the saved token"}
      </Button>
      <Result state={state} />
    </form>
  )
}
