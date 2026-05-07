import { getPublicOrganisers } from "@/lib/data/public"
import OrganisersClient from "./organisers-client"

export const dynamic = "force-dynamic"

export default async function OrganisersPage() {
  const organisers = await getPublicOrganisers({ limit: 50 })
  return <OrganisersClient initialOrganisers={organisers} />
}
