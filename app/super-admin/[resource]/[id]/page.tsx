import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { updateResourceAction } from "../../actions"

export default async function SuperAdminEditResourcePage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  await requireSuperAdmin()
  const { resource: resourceKey, id } = await params
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()

  const admin = createAdminClient()
  const { data, error } = await admin.from(resource.table).select("*").eq(resource.primaryKey, id).maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()

  async function updateRecord(formData: FormData) {
    "use server"
    await updateResourceAction(resource.key, id, formData)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 rounded-full px-0 hover:bg-transparent">
        <Link href={`/super-admin/${resource.key}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to {resource.label}</Link>
      </Button>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Edit {resource.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceForm resource={resource} record={data} action={updateRecord} submitLabel="Save changes" />
        </CardContent>
      </Card>
    </main>
  )
}
