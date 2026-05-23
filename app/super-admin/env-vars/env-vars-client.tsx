"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { useToast } from "@/hooks/use-toast"

type EnvTarget = "production" | "preview" | "development"
type EnvType = "plain" | "secret" | "encrypted" | "system"

interface ClientEnvVar {
  id: string
  key: string
  value: null
  type: EnvType
  target: EnvTarget[]
  createdAt: number
  updatedAt: number
  gitBranch?: string
}

const TARGETS: { value: EnvTarget; label: string }[] = [
  { value: "production", label: "Production" },
  { value: "preview", label: "Preview" },
  { value: "development", label: "Development" },
]

const inputClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

function relativeTime(ms: number) {
  if (!ms) return "—"
  const diff = Date.now() - ms
  const day = 86_400_000
  if (diff < day) return "today"
  const days = Math.round(diff / day)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`
  const years = Math.round(months / 12)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

function TargetPills({ target }: { target: EnvTarget[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {TARGETS.map((t) => {
        const active = target.includes(t.value)
        return (
          <span
            key={t.value}
            title={`${t.label}: ${active ? "active" : "not set"}`}
            className={
              active
                ? "h-2.5 w-2.5 rounded-full bg-accent"
                : "h-2.5 w-2.5 rounded-full border border-line-2 bg-transparent"
            }
          />
        )
      })}
    </div>
  )
}

interface FormState {
  mode: "create" | "edit"
  id?: string
  key: string
  value: string
  type: "plain" | "encrypted"
  target: EnvTarget[]
}

const EMPTY_FORM: FormState = {
  mode: "create",
  key: "",
  value: "",
  type: "encrypted",
  target: ["production", "preview", "development"],
}

export function EnvVarsClient() {
  const { toast } = useToast()
  const [envVars, setEnvVars] = useState<ClientEnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [envFilter, setEnvFilter] = useState<EnvTarget | "all">("all")
  const [form, setForm] = useState<FormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ClientEnvVar | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showError = useCallback(
    (message: string) => {
      toast({ variant: "destructive", title: "Something went wrong", description: message })
    },
    [toast],
  )

  const fetchEnvVars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/super-admin/env-vars", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load environment variables")
      setEnvVars(data.envVars ?? [])
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to load environment variables")
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void fetchEnvVars()
  }, [fetchEnvVars])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return envVars
      .filter((v) => (term ? v.key.toLowerCase().includes(term) : true))
      .filter((v) => (envFilter === "all" ? true : v.target.includes(envFilter)))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [envVars, search, envFilter])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
  }

  function openEdit(envVar: ClientEnvVar) {
    const editableType = envVar.type === "plain" ? "plain" : "encrypted"
    setForm({
      mode: "edit",
      id: envVar.id,
      key: envVar.key,
      value: "",
      type: editableType,
      target: envVar.target.length ? envVar.target : ["production"],
    })
  }

  function toggleFormTarget(target: EnvTarget) {
    setForm((current) => {
      if (!current) return current
      const has = current.target.includes(target)
      return {
        ...current,
        target: has ? current.target.filter((t) => t !== target) : [...current.target, target],
      }
    })
  }

  async function submitForm() {
    if (!form) return

    if (form.target.length === 0) {
      showError("Select at least one target environment.")
      return
    }

    if (form.mode === "create") {
      const key = form.key.trim()
      if (!key) { showError("Key is required."); return }
      if (/\s/.test(key)) { showError("Key cannot contain spaces."); return }
      if (!form.value) { showError("Value is required."); return }
    }

    setSubmitting(true)
    try {
      let res: Response
      if (form.mode === "create") {
        res = await fetch("/api/super-admin/env-vars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: form.key.trim(),
            value: form.value,
            type: form.type,
            target: form.target,
          }),
        })
      } else {
        res = await fetch("/api/super-admin/env-vars", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.id,
            target: form.target,
            ...(form.value ? { value: form.value } : {}),
          }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")

      toast({
        title: form.mode === "create" ? "Environment variable created" : "Environment variable updated",
        description: form.key,
      })
      setForm(null)
      await fetchEnvVars()
    } catch (error) {
      showError(error instanceof Error ? error.message : "Request failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const target = pendingDelete
    setEnvVars((current) => current.filter((v) => v.id !== target.id))
    try {
      const res = await fetch("/api/super-admin/env-vars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Delete failed")
      toast({ title: "Environment variable deleted", description: target.key })
    } catch (error) {
      showError(error instanceof Error ? error.message : "Delete failed")
      await fetchEnvVars()
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-h3">Variables</p>
            <p className="text-[12px] text-ink-3">
              {loading ? "Loading…" : `${envVars.length} variables · production / preview / development`}
            </p>
          </div>
          <Button variant="primary" size="md" onClick={openCreate}>
            <Icon name="plus" size={14} /> Add new
          </Button>
        </CardBody>
        <CardDivider />
        <CardBody className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by key name…"
              className={cn(inputClass, "h-10 max-w-xs")}
            />
            <div className="flex items-center gap-1.5">
              <FilterButton active={envFilter === "all"} onClick={() => setEnvFilter("all")}>
                All
              </FilterButton>
              {TARGETS.map((t) => (
                <FilterButton
                  key={t.value}
                  active={envFilter === t.value}
                  onClick={() => setEnvFilter(t.value)}
                >
                  {t.label}
                </FilterButton>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 w-full animate-pulse rounded-[var(--radius-md)] bg-line/60" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-line-2 p-6 text-[13px] text-ink-3">
              {envVars.length === 0
                ? "No environment variables found."
                : "No variables match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-left text-label">Key</th>
                    <th className="px-4 py-3 text-left text-label">Targets</th>
                    <th className="px-4 py-3 text-left text-label">Type</th>
                    <th className="px-4 py-3 text-left text-label">Updated</th>
                    <th className="px-4 py-3 text-right text-label">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((envVar, i) => (
                    <tr key={envVar.id} className={i > 0 ? "border-t border-line" : ""}>
                      <td className="px-4 py-3 font-mono text-[12px] font-medium text-ink">{envVar.key}</td>
                      <td className="px-4 py-3">
                        <TargetPills target={envVar.target} />
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" variant="default">{envVar.type}</Chip>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-3">{relativeTime(envVar.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(envVar)}>
                            <Icon name="settings" size={12} /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-danger hover:bg-danger-soft"
                            onClick={() => setPendingDelete(envVar)}
                          >
                            <Icon name="trash" size={12} /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-line-2" /> Not set
            </span>
            <span>Order: Production · Preview · Development</span>
          </div>
        </CardBody>
      </Card>

      {form ? (
        <Card>
          <CardBody className="flex items-center justify-between px-5 py-4">
            <p className="text-h3">
              {form.mode === "create" ? "Add environment variable" : `Edit ${form.key}`}
            </p>
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setForm(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          </CardBody>
          <CardDivider />
          <CardBody className="flex flex-col gap-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-label">Key</span>
                <input
                  id="env-key"
                  value={form.key}
                  disabled={form.mode === "edit"}
                  onChange={(event) => setForm({ ...form, key: event.target.value })}
                  onBlur={(event) => setForm({ ...form, key: event.target.value.toUpperCase() })}
                  placeholder="MY_API_KEY"
                  className={cn(inputClass, "h-11 font-mono disabled:opacity-60")}
                />
                {form.mode === "edit" && (
                  <span className="font-mono text-[11px] text-ink-3">Key names cannot be changed.</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-label">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "plain" | "encrypted" })}
                  className={cn(selectClass, "h-11")}
                >
                  <option value="encrypted">encrypted</option>
                  <option value="plain">plain</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-label">Value</span>
              <textarea
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                placeholder={
                  form.mode === "edit"
                    ? "Enter new value to update (leave blank to keep current)"
                    : "Variable value"
                }
                className={cn(inputClass, "min-h-24 resize-none")}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-label">Targets</span>
              <div className="flex flex-wrap gap-3">
                {TARGETS.map((t) => (
                  <label
                    key={t.value}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-line-2 bg-surface px-4 py-2 text-[13px] font-medium text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={form.target.includes(t.value)}
                      onChange={() => toggleFormTarget(t.value)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={submitForm} disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : form.mode === "create"
                    ? "Create variable"
                    : "Save changes"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardBody className="flex flex-col gap-4 p-5">
              <p className="text-h3">Delete environment variable</p>
              <p className="text-[13px] text-ink-3">
                Delete <span className="font-mono font-semibold text-ink">{pendingDelete.key}</span>?
                This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="md" onClick={() => setPendingDelete(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="bg-danger border-danger hover:bg-danger/90"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-ink px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-surface"
          : "rounded-full border border-line-2 bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3 transition hover:bg-bg hover:text-ink"
      }
    >
      {children}
    </button>
  )
}
