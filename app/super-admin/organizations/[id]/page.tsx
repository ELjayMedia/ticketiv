import ResourcePage, { generateMetadata as resourceMetadata } from "@/app/super-admin/[resource]/[id]/page"

// /super-admin/organizations is now the organisers list; the raw record editor
// (/super-admin/organizations/<id>?raw=1, "Edit record") keeps working through the
// generic resource page.
export async function generateMetadata() {
  return resourceMetadata({ params: Promise.resolve({ resource: "organizations" }) })
}

export default async function AdminOrganizationRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ raw?: string }> }) {
  const { id } = await params
  return ResourcePage({ params: Promise.resolve({ resource: "organizations", id }), searchParams })
}
