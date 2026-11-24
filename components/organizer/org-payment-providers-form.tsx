"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { cn } from "@/lib/cn"

type Result = { ok: boolean; message: string }

export interface OrgProviderOption {
  id: string
  label: string
  sub: string
  available: boolean
  note: string | null
}

/** Organisation default payment methods: all available, or a chosen subset (TICK-394). */
export function OrgPaymentProvidersForm({
  orgId,
  options,
  current,
  action,
}: {
  orgId: string
  options: OrgProviderOption[]
  current: string[]
  action: (prev: Result | null, formData: FormData) => Promise<Result>
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const [mode, setMode] = useState<"all" | "custom">(current.length > 0 ? "custom" : "all")
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgId" value={orgId} />
      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="text-label mb-1">Buyers can pay with</legend>
        <label className="flex items-start gap-2 text-[14px]">
          <input type="radio" name="mode" value="all" checked={mode === "all"} onChange={() => setMode("all")} className="mt-1" />
          <span>
            <span className="font-semibold">All available methods</span>
            <span className="block text-[12px] text-ink-3">Every method Ticketiv has switched on, including ones added later.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-[14px]">
          <input type="radio" name="mode" value="custom" checked={mode === "custom"} onChange={() => setMode("custom")} className="mt-1" />
          <span>
            <span className="font-semibold">Only the methods I choose</span>
            <span className="block text-[12px] text-ink-3">Events and ticket types can narrow this further, never widen it.</span>
          </span>
        </label>
      </fieldset>
      <fieldset disabled={pending || mode === "all"} className={cn("flex flex-col gap-2 rounded-md border border-line p-3", mode === "all" && "opacity-60")}>
        {options.map((o) => (
          <label key={o.id} className="flex items-start gap-2 text-[14px]">
            <input type="checkbox" name="providers" value={o.id} defaultChecked={current.includes(o.id)} className="mt-1 h-4 w-4" />
            <span>
              <span className="font-semibold">{o.label}</span> <span className="text-ink-3">· {o.sub}</span>
              {!o.available ? <span className="block text-[12px] text-warning">{o.note ?? "Not available on Ticketiv right now."}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Save payment methods"}
        </Button>
      </div>
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-[13px]", state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
