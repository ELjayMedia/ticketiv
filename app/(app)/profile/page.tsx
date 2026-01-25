"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Bell, Globe, Users, UserPlus, HelpCircle, Lock, LogOut, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

interface ProfileData {
  name: string
  avatar_url?: string
  friends_count: number
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
        if (!session) {
          router.push("/login")
          return
        }

        // For demo, use hardcoded profile data
        setProfile({
          name: "Smit modl",
          avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
          friends_count: 10,
        })
      } catch (error) {
        console.error("Failed to load profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <div className="flex flex-col items-center pt-8 px-4 pb-6 border-b">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 overflow-hidden mb-3">
          {profile?.avatar_url && (
            <img src={profile.avatar_url || "/placeholder.svg"} alt={profile.name} className="w-full h-full object-cover" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{profile?.name}</h1>
        <p className="text-sm text-muted-foreground">{profile?.friends_count} Friends</p>
      </div>

      {/* My Account Section */}
      <div className="px-4 py-4 space-y-2">
        <h2 className="text-lg font-bold text-foreground mb-3">My Account</h2>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <User className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Personal Information</span>
          </button>
        </Card>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Language</span>
          </button>
        </Card>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">My Friends</span>
          </button>
        </Card>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <UserPlus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Invite Friends</span>
          </button>
        </Card>
      </div>

      {/* Notifications Section */}
      <div className="px-4 py-4 space-y-2">
        <h2 className="text-lg font-bold text-foreground mb-3">Notifications</h2>
        <Card className="border-none shadow-none bg-card/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Bell className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Push Notifications</span>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
        </Card>
      </div>

      {/* More Section */}
      <div className="px-4 py-4 space-y-2">
        <h2 className="text-lg font-bold text-foreground mb-3">More</h2>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Help Centre</span>
          </button>
        </Card>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <Lock className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Privacy Policy</span>
          </button>
        </Card>
        <Card className="border-none shadow-none bg-card/50">
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Logout</span>
          </button>
        </Card>
      </div>
    </div>
  )
}
