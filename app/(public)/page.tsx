import HomeClient from "./home-client"

export const dynamic = "force-dynamic"

/**
 * Emergency resilience guard.
 *
 * The public homepage must render even when Supabase/Vercel env access is slow or
 * temporarily misconfigured. Public discovery data can be reintroduced through a
 * time-bounded API/client fetch, but the root route should never block long
 * enough to produce a Vercel 504.
 */
export default async function PublicHomePage() {
  return <HomeClient initialEvents={[]} initialVenues={[]} initialArtists={[]} />
}
