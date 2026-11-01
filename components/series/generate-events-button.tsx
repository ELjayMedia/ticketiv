"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateSeriesEventsAction } from "@/app/orgs/[orgId]/series/actions"
import { Button } from "@/components/quiet/ui/button";
import { Input, Label } from "@/components/quiet/ui/form";
import { Icon } from "@/components/quiet/ui/icon"

interface GenerateEventsButtonProps {
  orgId: string
  seriesId: string
}

export function GenerateEventsButton({ orgId, seriesId }: GenerateEventsButtonProps) {
  const router = useRouter()
  const [count, setCount] = useState(6)
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateSeriesEventsAction(orgId, seriesId, count)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Created ${result.created} draft event${result.created === 1 ? "" : "s"}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/40 p-4 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="generate-count">Generate from recurrence pattern</Label>
        <p className="text-xs text-ink-3">
          Creates draft events on the next dates — add venue and tickets before publishing.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="generate-count" className="text-xs">
            How many
          </Label>
          <Input
            id="generate-count"
            type="number"
            min={1}
            max={52}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <Button variant="accent" type="button" onClick={handleGenerate} disabled={isPending}>
          <Icon name="cal" className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {isPending ? "Generating…" : "Generate"}
        </Button>
      </div>
    </div>
  )
}
