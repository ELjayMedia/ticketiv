"use client"

import { useState } from "react"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { deleteWorkspaceAction } from "./delete-workspace-action"

export function DeleteWorkspacePanel({ orgId, orgName, error }: { orgId: string; orgName: string; error?: string }) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const matches = confirmation === orgName

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-h2 text-danger">Danger zone</h2>
        <p className="mt-1 text-[13px] text-ink-3">Permanent workspace actions are restricted to the owner.</p>
      </div>
      <Card className="border-danger/30">
        <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-ink">Delete workspace</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              Only empty workspaces can be deleted. Workspaces with events, orders, payouts, payout accounts, or resale activity are protected.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-[var(--radius)] border border-danger px-4 py-2 text-[13px] font-semibold text-danger hover:bg-danger-soft"
          >
            Delete workspace
          </button>
        </CardBody>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-workspace-title">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-surface p-5 shadow-xl">
            <h2 id="delete-workspace-title" className="text-[18px] font-semibold text-ink">Delete {orgName}?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
              This permanently removes the workspace and cannot be undone. Type <strong className="text-ink">{orgName}</strong> to confirm.
            </p>
            {error && <p className="mt-3 rounded-[var(--radius)] bg-danger-soft p-3 text-[12px] text-danger">{error}</p>}
            <form action={deleteWorkspaceAction} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="orgId" value={orgId} />
              <input
                name="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                className="h-11 rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
                placeholder={orgName}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-bg">Cancel</button>
                <button disabled={!matches} className="flex-1 rounded-[var(--radius)] bg-danger px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Delete permanently</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
