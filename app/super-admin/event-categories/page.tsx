import { revalidatePath } from "next/cache"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export const metadata = { title: "Event Categories" }

type SearchParams = Promise<{ status?: string }>

const textareaClass =
  "min-h-20 w-full resize-none rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function createCategoryAction(formData: FormData) {
  "use server"

  await requireSuperAdmin()
  const admin = createAdminClient()

  const name = String(formData.get("name") ?? "").trim()
  const slugValue = String(formData.get("slug") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const sortOrder = Number(formData.get("sort_order") ?? 100)

  if (!name) throw new Error("Category name is required")

  const { error } = await admin.from("event_categories").insert({
    name,
    slug: slugify(slugValue || name),
    description: description || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
    is_active: formData.get("is_active") === "on",
  })

  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/event-categories")
  revalidatePath("/browse")
}

async function updateCategoryAction(formData: FormData) {
  "use server"

  await requireSuperAdmin()
  const admin = createAdminClient()

  const id = String(formData.get("id") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const slugValue = String(formData.get("slug") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const sortOrder = Number(formData.get("sort_order") ?? 100)

  if (!id || !name) throw new Error("Category ID and name are required")

  const { error } = await admin
    .from("event_categories")
    .update({
      name,
      slug: slugify(slugValue || name),
      description: description || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/event-categories")
  revalidatePath("/browse")
}

export default async function EventCategoriesPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const user = await requireSuperAdmin()
  const query = searchParams ? await searchParams : {}
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("event_categories")
    .select("id, name, slug, description, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Super admin control</p>
          <h1 className="text-h1">Event categories</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Manage the official category list used by organizers when creating events and by attendees when browsing.
          </p>
        </div>
        <p className="w-fit rounded-full border border-line bg-bg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
          Signed in as {user.email ?? "Super Admin"}
        </p>
      </section>

      {query.status === "saved" ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
          <Icon name="check" size={14} /> Category saved successfully.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <Card>
          <CardBody className="px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="plus" size={16} className="text-ink-3" />
              Create category
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="p-5">
            <form action={createCategoryAction} className="grid gap-4">
              <FormField label="Name" name="name" placeholder="Music" required />
              <FormField
                label="Slug"
                name="slug"
                placeholder="music"
                hint="Leave blank to generate from the name."
              />
              <label className="flex flex-col gap-1">
                <span className="text-label">Description</span>
                <textarea name="description" className={`${textareaClass} min-h-24`} />
              </label>
              <FormField label="Sort order" name="sort_order" type="number" defaultValue={100} />
              <label className="flex cursor-pointer items-center gap-3 rounded-full border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-medium text-ink">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Active
              </label>
              <Button type="submit" variant="primary" size="md">
                Create category
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-h3">Managed categories</p>
          </CardBody>
          <CardDivider />
          <CardBody className="flex flex-col gap-3 p-5">
            {(data ?? []).map((category) => (
              <form
                key={category.id}
                action={updateCategoryAction}
                className="grid gap-3 rounded-[var(--radius-md)] border border-line p-4 lg:grid-cols-[1fr_1fr_0.45fr_auto] lg:items-end"
              >
                <input type="hidden" name="id" value={category.id} />
                <FormField label="Name" name="name" defaultValue={category.name} required />
                <FormField label="Slug" name="slug" defaultValue={category.slug} required />
                <FormField label="Sort" name="sort_order" type="number" defaultValue={category.sort_order} />
                <label className="flex h-10 cursor-pointer items-center gap-2 self-end rounded-full border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink">
                  <input
                    name="is_active"
                    type="checkbox"
                    defaultChecked={category.is_active}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  Active
                </label>
                <label className="flex flex-col gap-1 lg:col-span-4">
                  <span className="text-label">Description</span>
                  <textarea
                    name="description"
                    defaultValue={category.description ?? ""}
                    className={textareaClass}
                  />
                </label>
                <div className="flex justify-end lg:col-span-4">
                  <Button type="submit" variant="outline" size="md">
                    Save changes
                  </Button>
                </div>
              </form>
            ))}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
