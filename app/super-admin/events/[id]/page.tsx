import ResourcePage, { generateMetadata as resourceMetadata } from "@/app/super-admin/[resource]/[id]/page"

// /super-admin/events is now the events list below; the raw record editor
// (/super-admin/events/<id>?raw=1, "Edit record") keeps working through the
// generic resource page.
export async function generateMetadata() {
  return resourceMetadata({ params: Promise.resolve({ resource: "events" }) })
}

export default async function AdminEventRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ raw?: string }> }) {
  const { id } = await params
  return ResourcePage({ params: Promise.resolve({ resource: "events", id }), searchParams })
}
