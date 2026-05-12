import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { createResourceAction } from "../actions"

function displayCell(value: unknown) {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export default async function SuperAdminResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  await requireSuperAdmin()
  const { resource: resourceKey } = await params
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(resource.table)
    .select("*")
    .order(resource.orderBy, { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  async function createRecord(formData: FormData) {
    "use server"
    await createResourceAction(resource.key, formData)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-3 rounded-full px-0 hover:bg-transparent">
            <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Super admin</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{resource.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create record</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceForm resource={resource} action={createRecord} submitLabel={`Create ${resource.label}`} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Latest records</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {resource.listColumns.map((column) => <th key={column} className="px-3 py-3 font-medium">{column}</th>)}
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => {
                  const recordId = String(row[resource.primaryKey])
                  return (
                    <tr key={recordId} className="border-b last:border-0">
                      {resource.listColumns.map((column) => (
                        <td key={column} className="max-w-[220px] truncate px-3 py-3">{displayCell(row[column])}</td>
                      ))}
                      <td className="px-3 py-3">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <Link href={`/super-admin/${resource.key}/${recordId}`}>Edit</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
