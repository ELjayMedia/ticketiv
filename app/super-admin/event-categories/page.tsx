import { revalidatePath } from "next/cache"
import { CheckCircle2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export const metadata = { title: "Event Categories" }

type SearchParams = Promise<{ status?: string }>

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

export default async function EventCategoriesPage({ searchParams }: { searchParams?: SearchParams }) {
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
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:flex md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Super admin control</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Event Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage the official category list used by organizers when creating events and by attendees when browsing.
          </p>
        </div>
        <p className="mt-4 rounded-full border px-3 py-1.5 text-xs text-muted-foreground md:mt-0">
          Signed in as {user.email ?? "Super Admin"}
        </p>
      </section>

      {query.status === "saved" ? (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> Category saved successfully.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> Create category</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCategoryAction} className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-name">Name</label>
                <Input id="new-name" name="name" placeholder="Music" required className="h-11 rounded-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-slug">Slug</label>
                <Input id="new-slug" name="slug" placeholder="music" className="h-11 rounded-full" />
                <p className="text-xs text-muted-foreground">Leave blank to generate from the name.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-description">Description</label>
                <textarea id="new-description" name="description" className="min-h-24 w-full rounded-2xl border bg-background px-4 py-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-sort-order">Sort order</label>
                <Input id="new-sort-order" name="sort_order" type="number" defaultValue={100} className="h-11 rounded-full" />
              </div>
              <label className="flex items-center gap-3 rounded-full border px-4 py-3 text-sm">
                <input name="is_active" type="checkbox" defaultChecked /> Active
              </label>
              <Button type="submit" className="rounded-full">Create category</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Managed categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data ?? []).map((category) => (
              <form key={category.id} action={updateCategoryAction} className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_1fr_0.45fr_auto] lg:items-end">
                <input type="hidden" name="id" value={category.id} />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input name="name" defaultValue={category.name} className="h-10 rounded-full" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Slug</label>
                  <Input name="slug" defaultValue={category.slug} className="h-10 rounded-full" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Sort</label>
                  <Input name="sort_order" type="number" defaultValue={category.sort_order} className="h-10 rounded-full" />
                </div>
                <label className="flex h-10 items-center gap-2 rounded-full border px-3 text-sm">
                  <input name="is_active" type="checkbox" defaultChecked={category.is_active} /> Active
                </label>
                <div className="space-y-2 lg:col-span-4">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea name="description" defaultValue={category.description ?? ""} className="min-h-20 w-full rounded-2xl border bg-background px-4 py-3 text-sm" />
                </div>
                <div className="flex justify-end lg:col-span-4">
                  <Button type="submit" variant="outline" className="rounded-full">Save changes</Button>
                </div>
              </form>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
