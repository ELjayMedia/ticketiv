"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { deleteSeriesAction } from "@/app/orgs/[orgId]/series/actions"

interface DeleteSeriesButtonProps {
  orgId: string
  seriesId: string
  seriesTitle: string
  childEventCount: number
}

export function DeleteSeriesButton({
  orgId,
  seriesId,
  seriesTitle,
  childEventCount,
}: DeleteSeriesButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSeriesAction(orgId, seriesId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Series deleted")
      router.push(`/orgs/${orgId}/series`)
      router.refresh()
    })
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Delete series
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-lg">
          <AlertDialog.Title className="font-display text-lg font-bold">
            Delete “{seriesTitle}”?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {childEventCount > 0 ? (
              <>
                {childEventCount} event{childEventCount === 1 ? "" : "s"} in this series will be kept
                as standalone event{childEventCount === 1 ? "" : "s"} — they won&apos;t be deleted.
                This series page will no longer exist.
              </>
            ) : (
              <>This series has no events. The series page will no longer exist.</>
            )}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" size="sm" disabled={isPending}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete series"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
