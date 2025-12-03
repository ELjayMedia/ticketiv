import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session.user.email} disabled className="mt-1" />
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={profile?.full_name || ""} placeholder="Your full name" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue={profile?.phone || ""} placeholder="Your phone number" className="mt-1" />
            </div>
            <Button>Update Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">{new Date(session.user.created_at || "").toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last login</p>
              <p className="font-medium">{new Date(session.user.last_sign_in_at || "").toLocaleDateString()}</p>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Change Password
            </Button>
            <Button variant="destructive" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
