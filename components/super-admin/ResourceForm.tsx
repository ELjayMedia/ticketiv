import type { AdminResource } from "@/lib/super-admin/resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function toInputDateTime(value: unknown) {
  if (!value) return ""
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 16)
}

function formatValue(type: string, value: unknown) {
  if (value === null || value === undefined) return ""
  if (type === "datetime") return toInputDateTime(value)
  if (type === "json") return JSON.stringify(value, null, 2)
  return String(value)
}

export function ResourceForm({
  resource,
  record,
  action,
  submitLabel,
}: {
  resource: AdminResource
  record?: Record<string, unknown> | null
  action: (formData: FormData) => void
  submitLabel: string
}) {
  return (
    <form action={action} className="grid gap-4 rounded-3xl border bg-card p-5 shadow-sm md:grid-cols-2">
      {resource.fields.map((field) => {
        const value = record?.[field.name]

        if (field.type === "readonly") {
          return (
            <div key={field.name} className="space-y-2 md:col-span-2">
              <Label>{field.label}</Label>
              <Input value={formatValue(field.type, value)} readOnly className="h-11 rounded-full bg-muted" />
            </div>
          )
        }

        if (field.type === "select") {
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <select
                id={field.name}
                name={field.name}
                defaultValue={formatValue(field.type, value) || field.options?.[0] || ""}
                required={field.required}
                className="flex h-11 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
              >
                {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          )
        }

        if (field.type === "boolean") {
          return (
            <label key={field.name} className="flex h-11 items-center gap-3 rounded-full border px-4 text-sm">
              <input name={field.name} type="checkbox" defaultChecked={Boolean(value)} />
              {field.label}
            </label>
          )
        }

        if (field.type === "json" || field.name === "description" || field.name === "bio") {
          return (
            <div key={field.name} className="space-y-2 md:col-span-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <textarea
                id={field.name}
                name={field.name}
                defaultValue={formatValue(field.type, value)}
                placeholder={field.placeholder}
                required={field.required}
                className="min-h-28 w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm"
              />
            </div>
          )
        }

        const inputType = field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={inputType}
              defaultValue={formatValue(field.type, value)}
              placeholder={field.placeholder}
              required={field.required}
              className="h-11 rounded-full"
            />
          </div>
        )
      })}

      <div className="flex justify-end md:col-span-2">
        <Button type="submit" className="rounded-full">{submitLabel}</Button>
      </div>
    </form>
  )
}
