import { z } from "zod"

export const recurrenceWeekDay = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])

export const recurrencePatternSchema = z.union([
  z.object({
    freq: z.literal("weekly"),
    byday: z.array(recurrenceWeekDay).min(1, "Pick at least one day"),
    time: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  }),
  z.object({
    freq: z.literal("monthly"),
    bymonthday: z.number().int().min(1).max(31).optional(),
    byday: recurrenceWeekDay.optional(),
    time: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  }),
  z.object({
    freq: z.literal("daily"),
    time: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  }),
])

export const seriesTypeSchema = z.enum(["tour", "recurring", "season"])

export const seriesFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Lowercase letters, numbers and hyphens only")
      .min(2)
      .max(80)
      .optional()
      .or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    series_type: seriesTypeSchema,
    cover_image_url: z.string().trim().url().optional().or(z.literal("")),
    starts_on: z.string().optional().or(z.literal("")),
    ends_on: z.string().optional().or(z.literal("")),
    recurrence_pattern: recurrencePatternSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.starts_on || !data.ends_on) return true
      return new Date(data.ends_on) >= new Date(data.starts_on)
    },
    { message: "End date must be on or after start date", path: ["ends_on"] },
  )
  .refine(
    (data) => data.series_type !== "recurring" || data.recurrence_pattern != null,
    { message: "Recurrence pattern is required", path: ["recurrence_pattern"] },
  )

export type SeriesFormValues = z.infer<typeof seriesFormSchema>
