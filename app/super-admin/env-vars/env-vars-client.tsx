"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
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

const TARGETS: { value: EnvTarget; label: string; short: string }[] = [
  { value: "production", label: "Production", short: "P" },
  { value: "preview", label: "Preview", short: "Prev" },
  { value: "development", label: "Development", short: "D" },
]

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
                ? "h-2.5 w-2.5 rounded-full bg-primary"
                : "h-2.5 w-2.5 rounded-full border border-muted-foreground/40 bg-transparent"
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
      if (!key) {
        showError("Key is required.")
        return
      }
      if (/\s/.test(key)) {
        showError("Key cannot contain spaces.")
        return
      }
      if (!form.value) {
        showError("Value is required.")
        return
      }
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
    <div className="space-y-5">
      <Card className="rounded-2xl">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Variables</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading ? "Loading…" : `${envVars.length} variables · production / preview / development`}
              </p>
            </div>
            <Button className="rounded-full" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add new
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by key name…"
              className="h-10 max-w-xs rounded-full"
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
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              {envVars.length === 0
                ? "No environment variables found."
                : "No variables match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((envVar) => (
                    <TableRow key={envVar.id}>
                      <TableCell className="font-mono text-xs font-medium">{envVar.key}</TableCell>
                      <TableCell>
                        <TargetPills target={envVar.target} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{envVar.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeTime(envVar.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => openEdit(envVar)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full text-destructive"
                            onClick={() => setPendingDelete(envVar)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground/40" /> Not set
            </span>
            <span>Order: Production · Preview · Development</span>
          </div>
        </CardContent>
      </Card>

      {form ? (
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {form.mode === "create" ? "Add environment variable" : `Edit ${form.key}`}
              </CardTitle>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => setForm(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="env-key">
                  Key
                </label>
                <Input
                  id="env-key"
                  value={form.key}
                  disabled={form.mode === "edit"}
                  onChange={(event) => setForm({ ...form, key: event.target.value })}
                  onBlur={(event) => setForm({ ...form, key: event.target.value.toUpperCase() })}
                  placeholder="MY_API_KEY"
                  className="h-11 rounded-full font-mono"
                />
                {form.mode === "edit" ? (
                  <p className="text-xs text-muted-foreground">Key names cannot be changed.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="env-type">
                  Type
                </label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as "plain" | "encrypted" })}
                >
                  <SelectTrigger id="env-type" className="h-11 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encrypted">encrypted</SelectItem>
                    <SelectItem value="plain">plain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="env-value">
                Value
              </label>
              <Textarea
                id="env-value"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                placeholder={
                  form.mode === "edit"
                    ? "Enter new value to update (leave blank to keep current)"
                    : "Variable value"
                }
                className="min-h-24 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Targets</p>
              <div className="flex flex-wrap gap-3">
                {TARGETS.map((t) => (
                  <label
                    key={t.value}
                    className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.target.includes(t.value)}
                      onChange={() => toggleFormTarget(t.value)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button className="rounded-full" onClick={submitForm} disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : form.mode === "create"
                    ? "Create variable"
                    : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Delete environment variable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete <span className="font-mono font-medium text-foreground">{pendingDelete.key}</span>?
                This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardContent>
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
          ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          : "rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
      }
    >
      {children}
    </button>
  )
}
