import { redirect } from "next/navigation"

export const metadata = { title: "Profile" }
export const dynamic = "force-dynamic"

/**
 * `/me` is the canonical personal-account route.
 *
 * Keep `/profile` as a compatibility entry point for old bookmarks and links,
 * but do not maintain a second copy of the profile loader and navigation logic.
 * This prevents the two profile surfaces from drifting into different states.
 */
export default function ProfilePage() {
  redirect("/me")
}
