"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, Check, Loader2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase"

export type AppNotification = {
  id: string
  user_id: string | null
  type: string
  payload: Record<string, unknown> | null
  status: string
  created_at: string
  delivered_at: string | null
  sent_at: string | null
  channel: string | null
  read_at: string | null
}

function notificationTitle(notification: AppNotification) {
  const payload = notification.payload ?? {}
  return String(payload.title ?? payload.subject ?? titleCase(notification.type))
}

function notificationBody(notification: AppNotification) {
  const payload = notification.payload ?? {}
  return String(payload.message ?? payload.body ?? payload.description ?? "Open to view details.")
}

function notificationHref(notification: AppNotification) {
  const payload = notification.payload ?? {}
  return String(payload.href ?? payload.url ?? "/notifications")
}

function notificationInitial(notification: AppNotification) {
  return notificationTitle(notification).charAt(0).toUpperCase() || "N"
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
}

function relativeDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium" }).format(date)
}

export function NotificationBell({ userId }: { userId?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !userId) {
      setNotifications([])
      setLoading(false)
      return
    }

    let active = true

    async function loadNotifications() {
      if (!supabase || !userId) return
      setLoading(true)
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, payload, status, created_at, delivered_at, sent_at, channel, read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (!active) return

      if (error) {
        console.error("[notifications] Failed to load notifications:", error.message)
        setNotifications([])
      } else {
        setNotifications((data ?? []) as AppNotification[])
      }

      setLoading(false)
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as AppNotification
          setNotifications((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 10))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as AppNotification
          setNotifications((current) => current.map((item) => (item.id === next.id ? next : item)))
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const unreadCount = notifications.filter((notification) => notification.read_at == null).length

  async function markAllAsRead() {
    if (!supabase || !userId || unreadCount === 0) return

    setSaving(true)
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)

    if (error) {
      console.error("[notifications] Failed to mark notifications as read:", error.message)
    } else {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? new Date().toISOString(),
        })),
      )
    }
    setSaving(false)
  }

  if (!userId) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative focus:ring-2 focus:ring-primary" aria-label="Notifications">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full p-0 text-[0.65rem]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={markAllAsRead} disabled={saving || unreadCount === 0}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            Mark read
          </Button>
        </div>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading notifications
          </div>
        ) : notifications.length ? (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild className="cursor-pointer p-0">
              <Link href={notificationHref(notification)} className="flex w-full items-start gap-3 px-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={notification.read_at != null ? "text-xs" : "bg-primary text-xs text-primary-foreground"}>
                    {notificationInitial(notification)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{notificationTitle(notification)}</span>
                    <span className="shrink-0 text-[0.7rem] text-muted-foreground">{relativeDate(notification.created_at)}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{notificationBody(notification)}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm font-medium">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
