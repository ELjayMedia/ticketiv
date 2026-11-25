"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

export interface SponsorEditorModel {
  id: string
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  events: number
}

export function SponsorEditor({ sponsor, canEdit, action }: { sponsor: SponsorEditorModel; canEdit: boolean; action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const [open, setOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setUploadError("")
    try {
      const data = new FormData()
      data.append("file", file)
      data.append("kind", "sponsor_logo")
      const res = await fetch("/api/uploads", { method: "POST", body: data })
      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !payload.url) throw new Error(payload.error || "Couldn't upload the logo")
      setLogoUrl(payload.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Couldn't upload the logo")
    } finally {
      setUploading(false)
    }
  }

  const shownLogo = logoUrl || sponsor.logoUrl
  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 p-3">
        {shownLogo ? (
          <img src={shownLogo} alt="" className="h-12 w-20 shrink-0 rounded border border-line bg-surface object-contain p-1" />
        ) : (
          <span className="inline-flex h-12 w-20 shrink-0 items-center justify-center rounded border border-dashed border-line-2 font-mono text-[10px] text-ink-4">
            NO LOGO
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold text-ink">{sponsor.name}</span>
          <span className="truncate font-mono text-[11px] text-ink-3">
            {[sponsor.websiteUrl, `${sponsor.events} event${sponsor.events === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
          </span>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="xs" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Close" : "Edit"}
          </Button>
        ) : null}
      </div>
      {open && canEdit ? (
        <form action={formAction} className="flex flex-col gap-3 border-t border-line p-3">
          <input type="hidden" name="id" value={sponsor.id} />
          <input type="hidden" name="logoUrl" value={logoUrl} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`n-${sponsor.id}`}>Name</Label>
              <Input id={`n-${sponsor.id}`} name="name" defaultValue={sponsor.name} maxLength={120} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`w-${sponsor.id}`}>Website</Label>
              <Input id={`w-${sponsor.id}`} name="websiteUrl" defaultValue={sponsor.websiteUrl ?? ""} placeholder="example.com" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-bg">
              {uploading ? "Uploading…" : sponsor.logoUrl ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
            </label>
            {sponsor.logoUrl ? (
              <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <input type="checkbox" name="clearLogo" className="h-4 w-4" /> Remove the logo
              </label>
            ) : null}
            {logoUrl ? <span className="text-[12px] text-success">New logo ready. Save to use it.</span> : null}
          </div>
          {uploadError ? <p className="text-[13px] text-danger">{uploadError}</p> : null}
          {state.status !== "idle" ? (
            <p className={cn("rounded-md px-3 py-2 text-[13px]", state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
              {state.message}
            </p>
          ) : null}
          <div>
            <Button type="submit" variant="accent" size="sm" disabled={pending || uploading}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
