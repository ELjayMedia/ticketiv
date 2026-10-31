"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/cn"
import { seriesFormSchema, type SeriesFormValues } from "@/lib/series/schema"
import { generateSeriesSlug } from "@/lib/series/slug"
import {
  createSeriesAction,
  updateSeriesAction,
  checkSlugAvailableAction,
} from "@/app/orgs/[orgId]/series/actions"
import { Button } from "@/components/quiet/ui/button";
import { Input, Label, Textarea } from "@/components/quiet/ui/form";
import { Select, SelectOption } from "@/components/quiet/ui/select";

const WEEK_DAYS: Array<{ key: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU"; label: string }> = [
  { key: "MO", label: "Mon" },
  { key: "TU", label: "Tue" },
  { key: "WE", label: "Wed" },
  { key: "TH", label: "Thu" },
  { key: "FR", label: "Fri" },
  { key: "SA", label: "Sat" },
  { key: "SU", label: "Sun" },
]

interface SeriesFormProps {
  orgId: string
  initial?: Partial<SeriesFormValues> & { id?: string }
  mode: "create" | "edit"
}

export function SeriesForm({ orgId, initial, mode }: SeriesFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [touchedSlug, setTouchedSlug] = useState(Boolean(initial?.slug))

  const defaults: SeriesFormValues = useMemo(
    () => ({
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      series_type: (initial?.series_type as SeriesFormValues["series_type"]) ?? "tour",
      cover_image_url: initial?.cover_image_url ?? "",
      starts_on: initial?.starts_on ?? "",
      ends_on: initial?.ends_on ?? "",
      recurrence_pattern:
        (initial?.recurrence_pattern as SeriesFormValues["recurrence_pattern"]) ?? null,
    }),
    [initial],
  )

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: defaults,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form

  const title = watch("title")
  const slug = watch("slug")
  const seriesType = watch("series_type")
  const recurrence = watch("recurrence_pattern")

  // Auto-generate slug from title until user manually edits it
  useEffect(() => {
    if (touchedSlug) return
    if (!title) return
    const generated = generateSeriesSlug(title)
    if (generated !== slug) {
      setValue("slug", generated, { shouldValidate: false })
    }
  }, [title, touchedSlug, slug, setValue])

  // Debounced availability check
  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle")
      return
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 2 || slug.length > 80) {
      setSlugStatus("idle")
      return
    }
    if (initial?.slug && slug === initial.slug) {
      setSlugStatus("available")
      return
    }
    setSlugStatus("checking")
    const handle = setTimeout(async () => {
      const ok = await checkSlugAvailableAction(slug, initial?.id)
      setSlugStatus(ok ? "available" : "taken")
    }, 300)
    return () => clearTimeout(handle)
  }, [slug, initial?.slug, initial?.id])

  // Sync recurrence default when series_type flips to/from recurring
  useEffect(() => {
    if (seriesType === "recurring" && !recurrence) {
      setValue("recurrence_pattern", { freq: "weekly", byday: ["FR"], time: "20:00" })
    } else if (seriesType !== "recurring" && recurrence) {
      setValue("recurrence_pattern", null)
    }
  }, [seriesType, recurrence, setValue])

  function onSubmit(values: SeriesFormValues) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSeriesAction(orgId, values)
          : await updateSeriesAction(orgId, initial!.id!, values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(mode === "create" ? "Series created" : "Changes saved")
      router.push(`/orgs/${orgId}/series/${result.slug}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} placeholder="Summer Sessions 2026" />
        {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <div className="relative">
          <Input
            id="slug"
            {...register("slug")}
            onChange={(e) => {
              setTouchedSlug(true)
              setValue("slug", e.target.value)
            }}
            placeholder="summer-sessions-2026"
            className="pr-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
            {slugStatus === "available" && <Check className="h-4 w-4 text-green-600" />}
            {slugStatus === "taken" && <X className="h-4 w-4 text-danger" />}
          </div>
        </div>
        <p className="text-xs text-ink-3">
          Public URL: /series/{slug || "your-slug"}
          {slugStatus === "taken" && <span className="ml-2 text-danger">Already taken</span>}
        </p>
        {errors.slug && <p className="text-xs text-danger">{errors.slug.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Series type</Label>
        <Controller
          control={control}
          name="series_type"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { key: "tour", title: "Tour", desc: "Different cities or venues" },
                { key: "recurring", title: "Recurring", desc: "Repeats on a schedule" },
                { key: "season", title: "Season", desc: "Fixed-length season run" },
              ].map((opt) => {
                const active = field.value === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => field.onChange(opt.key)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active ? "border-accent bg-accent/5" : "border-line hover:bg-surface-2",
                    )}
                  >
                    <p className="text-sm font-semibold">{opt.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{opt.desc}</p>
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={5}
          placeholder="What is this series about?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input id="cover_image_url" type="url" {...register("cover_image_url")} placeholder="https://…" />
        {errors.cover_image_url && (
          <p className="text-xs text-danger">{errors.cover_image_url.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts_on">Starts on (optional)</Label>
          <Input id="starts_on" type="date" {...register("starts_on")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_on">Ends on (optional)</Label>
          <Input id="ends_on" type="date" {...register("ends_on")} />
          {errors.ends_on && <p className="text-xs text-danger">{errors.ends_on.message}</p>}
        </div>
      </div>

      {seriesType === "recurring" && (
        <Controller
          control={control}
          name="recurrence_pattern"
          render={({ field }) => {
            const pattern = (field.value ?? { freq: "weekly", byday: ["FR"], time: "20:00" }) as
              | { freq: "weekly"; byday: Array<"MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU">; time?: string }
              | { freq: "monthly"; bymonthday?: number; time?: string }
              | { freq: "daily"; time?: string }
            return (
              <div className="space-y-4 rounded-xl border border-line bg-surface/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={pattern.freq}
                      onValueChange={(value) => {
                        if (value === "weekly") field.onChange({ freq: "weekly", byday: ["FR"], time: pattern.time ?? "20:00" })
                        else if (value === "monthly") field.onChange({ freq: "monthly", bymonthday: 1, time: pattern.time ?? "20:00" })
                        else field.onChange({ freq: "daily", time: pattern.time ?? "20:00" })
                      }}
                    >
                      <SelectOption value="weekly">Weekly</SelectOption>
                      <SelectOption value="monthly">Monthly</SelectOption>
                      <SelectOption value="daily">Daily</SelectOption>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rec-time">Time</Label>
                    <Input
                      id="rec-time"
                      type="time"
                      value={pattern.time ?? ""}
                      onChange={(e) => field.onChange({ ...pattern, time: e.target.value })}
                    />
                  </div>
                </div>

                {pattern.freq === "weekly" && (
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map((d) => {
                        const checked = pattern.byday.includes(d.key)
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              const next = checked
                                ? pattern.byday.filter((x) => x !== d.key)
                                : [...pattern.byday, d.key]
                              field.onChange({ ...pattern, byday: next })
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              checked
                                ? "border-accent bg-accent text-white"
                                : "border-line hover:bg-surface-2",
                            )}
                          >
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pattern.freq === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="rec-day">Day of month</Label>
                    <Input
                      id="rec-day"
                      type="number"
                      min={1}
                      max={31}
                      value={pattern.bymonthday ?? 1}
                      onChange={(e) =>
                        field.onChange({ ...pattern, bymonthday: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })
                      }
                    />
                  </div>
                )}
              </div>
            )
          }}
        />
      )}

      <div className="flex items-center gap-3">
        <Button variant="accent" type="submit" disabled={isPending || slugStatus === "taken"}>
          {isPending ? "Saving…" : mode === "create" ? "Create series" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
